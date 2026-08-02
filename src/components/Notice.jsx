export default function Notice({ items, tone }) {
  return <div className={`notice notice-${tone}`}><span aria-hidden="true">!</span><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></div>;
}
