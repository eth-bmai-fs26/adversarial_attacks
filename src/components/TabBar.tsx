interface TabBarProps {
  activeTab: 'demo' | 'lab';
  onTabChange: (tab: 'demo' | 'lab') => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="flex items-center gap-6 px-6" role="tablist">
      <Tab
        label="Demo"
        active={activeTab === 'demo'}
        onClick={() => onTabChange('demo')}
      />
      <Tab
        label="Try it yourself"
        active={activeTab === 'lab'}
        onClick={() => onTabChange('lab')}
      />
    </nav>
  );
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="pb-1 transition-colors duration-200"
      style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: '16px',
        fontWeight: 700,
        color: active ? '#38bdf8' : '#94a3b8',
        borderBottom: active ? '2px solid #38bdf8' : '2px solid transparent',
        background: 'none',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
