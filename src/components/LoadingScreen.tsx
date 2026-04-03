interface LoadingScreenProps {
  error?: string | null;
}

export default function LoadingScreen({ error }: LoadingScreenProps) {
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0f172a' }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 18,
            color: '#f472b6',
          }}
        >
          Failed to load data. Please refresh.
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0f172a' }}
    >
      <p
        className="animate-pulse"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 18,
          color: '#94a3b8',
        }}
      >
        Loading visualization...
      </p>
    </div>
  );
}
