import { contactHref, type Payload } from "@/lib/content-types";

export function ContactChannels({ channels, serviceHours }: { channels: Payload["contactChannels"]; serviceHours: string }) {
  if (!channels.length && !serviceHours) return null;
  return <section aria-label="Kanal kontak resmi">
    <h2>Kanal kontak resmi</h2>
    {channels.length > 0 && <ul>{channels.map((channel, i) => {
      const href = contactHref(channel);
      return <li key={i}><strong>{channel.label}</strong>: {href ? <a href={href} {...(channel.type === "url" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{channel.value}</a> : channel.value}</li>;
    })}</ul>}
    {serviceHours && <p><strong>Jam layanan:</strong> {serviceHours}</p>}
  </section>;
}
