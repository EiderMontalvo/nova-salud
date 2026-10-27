import { useId } from 'react';

export function Corazon({ className }) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 44" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fe0d2" />
          <stop offset="1" stopColor="#0f8a8a" />
        </linearGradient>
      </defs>
      <path
        d="M24 42C10.5 32.4 2 24.6 2 14.6 2 7.6 7.3 2 14 2c4.2 0 7.7 2.2 10 5.6C26.3 4.2 29.8 2 34 2c6.7 0 12 5.6 12 12.6 0 10-8.5 17.8-22 27.4z"
        fill={`url(#${id})`}
      />
      <path
        d="M7 21h9l3-6 5 12 4-9 2 3h11"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Marca({ grande = false, claro = false }) {
  const clases = ['marca', grande && 'marca-lg', claro && 'marca-claro'].filter(Boolean).join(' ');
  return (
    <span className={clases}>
      <Corazon className="marca-corazon" />
      <span className="marca-texto">
        <b>Nova</b> Salud
      </span>
    </span>
  );
}
