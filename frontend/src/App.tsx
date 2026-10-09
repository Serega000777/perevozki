import { useEffect, useState } from 'react';
import { api } from './api';
import { Equipment } from './Equipment';

type Me = { name: string; role: 'owner' | 'viewer' };

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<Me>('/auth/me').then(setMe, (e: Error) => setError(e.message));
  }, []);
  return (
    <main>
      <header>
        <div>
          <span className="eyebrow">{me ? `${me.name}${me.role === 'owner' ? '' : ' · просмотр'}` : 'Учёт техники'}</span>
          <h1>Перевозки</h1>
        </div>
        <div className="avatar">П</div>
      </header>
      {error ? <div className="alert">{error}</div> : me ? <Equipment readOnly={me.role !== 'owner'} /> : <div className="loader">Загружаем…</div>}
    </main>
  );
}
