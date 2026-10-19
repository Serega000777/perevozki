import { useEffect, useState } from 'react';
import { api } from './api';
import { Equipment } from './Equipment';

type Me = { name: string; role: 'owner' | 'viewer' };

// Вне Telegram подписи initData нет — вместо ошибки объясняем, где открыть приложение.
function OpenInTelegram() {
  return (
    <section className="notice">
      <h2>Откройте через Telegram</h2>
      <p>Перевозки работают внутри Telegram: так приложение узнаёт, кто вы, без логинов и паролей.</p>
      <a className="primary" href={import.meta.env.VITE_BOT_URL}>
        Открыть бота в Telegram
      </a>
      <p className="hint">В боте нажмите «Открыть» внизу экрана.</p>
    </section>
  );
}

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
      </header>
      {error && !window.Telegram?.WebApp.initData ? (
        <OpenInTelegram />
      ) : error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : me ? (
        <Equipment readOnly={me.role !== 'owner'} />
      ) : (
        <p className="loading">Загружаем…</p>
      )}
    </main>
  );
}
