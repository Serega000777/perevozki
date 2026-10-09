import { useEffect, useState } from 'react';
import { api } from './api';
import { Equipment } from './Equipment';

export default function App() {
  const [name, setName] = useState('');
  useEffect(() => {
    // Ошибку авторизации покажет экран техники, здесь достаточно имени.
    api<{ name: string }>('/auth/me').then(
      (me) => setName(me.name),
      () => undefined,
    );
  }, []);
  return (
    <main>
      <header>
        <div>
          <span className="eyebrow">{name || 'Учёт техники'}</span>
          <h1>Перевозки</h1>
        </div>
        <div className="avatar">П</div>
      </header>
      <Equipment />
    </main>
  );
}
