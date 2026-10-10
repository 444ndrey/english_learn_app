export default function Card({ className = "", children }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}
