interface ComingSoonCardProps {
  title: string
  description: string
  icon?: string
}

const ComingSoonCard = ({ title, description, icon = '🚧' }: ComingSoonCardProps) => (
  <div style={{
    background: 'linear-gradient(135deg, #f8f9fa 0%, #fff7ed 100%)',
    border: '2px dashed #e4e0d9',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  }}>
    <div style={{ fontSize: '2.5rem' }}>{icon}</div>
    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1F1B16' }}>{title}</h3>
    <span style={{
      background: '#f97316',
      color: '#fff',
      fontSize: '0.7rem',
      fontWeight: 700,
      padding: '0.2rem 0.6rem',
      borderRadius: '999px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}>Coming Soon</span>
    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b6459', lineHeight: 1.6, maxWidth: '320px' }}>{description}</p>
  </div>
)

export default ComingSoonCard
