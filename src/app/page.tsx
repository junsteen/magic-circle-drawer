'use client';

export default function Home() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0d0d1a',
      }}
    >
      <button
        onPointerDown={() => {
          console.log('POINTER_DOWN_FIRED');
          alert('TAPPED!');
        }}
        onTouchStart={() => {
          console.log('TOUCH_START_FIRED');
        }}
        onClick={() => {
          console.log('CLICK_FIRED');
        }}
        style={{
          padding: 40,
          fontSize: 32,
          fontWeight: 'bold',
          background: '#00e5ff',
          color: '#000',
          border: 'none',
          borderRadius: 20,
          cursor: 'pointer',
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        ● TAP ME ●
      </button>
      <p style={{ color: '#888', marginTop: 20, fontSize: 14 }}>
        Any event should trigger console.log
      </p>
    </div>
  );
}
