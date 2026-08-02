export default function PanelHeading({ eyebrow, title, detail }) {
  return <div className="panel-heading"><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div><span>{detail}</span></div>;
}
