export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface ConnectionStatusProps {
  state: ConnectionState;
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const isConnected = state === 'connected';

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
      <span
        className={`
          block w-3 h-3 rounded-full
          ${isConnected ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_6px_#ef4444]'}
        `}
        title={state}
      />
    </div>
  );
}
