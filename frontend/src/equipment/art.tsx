// Картинки техники: по одной на каждый вид (пак владельца от 2026-10-30, без логотипов марок).
// Файлы отдельные — браузер скачивает только те виды, что есть на экране.
import { useEffect, useState } from 'react';
import { apiBlob } from '../api';
import { artKind } from './catalog';
import type { Vehicle } from './types';

const PICTURES = import.meta.glob<string>('../assets/vehicles/*.webp', { eager: true, import: 'default' });
const pictureOf = (kind?: string | null) => PICTURES[`../assets/vehicles/${artKind(kind)}.webp`];

export function VehicleArt({ kind }: { kind?: string | null }) {
  return <img className="vehicle-art" src={pictureOf(kind)} alt="" loading="lazy" decoding="async" />;
}

// Blob-ссылки на фото живут, пока открыто приложение: машин немного, а повторно скачивать незачем.
const photos = new Map<string, Promise<string>>();
const photoUrl = (id: number, at: string) => {
  const key = `${id}:${at}`;
  if (!photos.has(key))
    photos.set(
      key,
      apiBlob(`/equipment/vehicles/${id}/photo?v=${encodeURIComponent(at)}`).then((b) => URL.createObjectURL(b)),
    );
  return photos.get(key)!;
};

// Своё фото машины, а пока его нет (или оно грузится) — картинка по виду техники.
export function VehicleImage({ vehicle }: { vehicle: Pick<Vehicle, 'id' | 'kind' | 'photoAt'> }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    setSrc(null);
    if (!vehicle.photoAt) return;
    let alive = true;
    photoUrl(vehicle.id, vehicle.photoAt).then(
      (url) => alive && setSrc(url),
      () => photos.delete(`${vehicle.id}:${vehicle.photoAt}`),
    );
    return () => {
      alive = false;
    };
  }, [vehicle.id, vehicle.photoAt]);
  return src ? <img className="vehicle-img" src={src} alt="" /> : <VehicleArt kind={vehicle.kind} />;
}
