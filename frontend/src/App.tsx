import { useEffect, useState } from 'react';
import { api } from './api';
import { PageHeader } from './brand';
import { Equipment, type Me } from './Equipment';

// Вне Telegram подписи initData нет — вместо ошибки объясняем, где открыть приложение.
function OpenInTelegram() {
  return (
    <section className="card notice">
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
  if (me)
    return (
      <main>
        <Equipment me={me} />
      </main>
    );
  return (
    <main>
      <PageHeader subtitle="Ваш автопарк, рейсы, расходы и аналитика в одном месте" />
      {error && !window.Telegram?.WebApp.initData ? (
        <OpenInTelegram />
      ) : error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : (
        <p className="loading">Загружаем…</p>
      )}
    </main>
  );
}
