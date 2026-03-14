export default function FAQ() {
  const qa = [
    {
      q: 'Do I need permission to host?',
      a: 'No. You can create events and list places with one account. There is no separate "host" application. Management rights come from owning or collaborating on specific places and events.',
    },
    {
      q: 'What does verification mean?',
      a: 'Verification confirms your identity to a defined standard. It may unlock public visibility features. It does not unlock creation or management—those are based on ownership and collaboration.',
    },
    {
      q: 'Who is responsible for events?',
      a: 'The organiser and place manager are responsible for their events and places. The platform facilitates connections; we are not the organiser.',
    },
    {
      q: 'Can I manage places and attend events?',
      a: 'Yes. One account lets you manage places, host events, collaborate on events, and attend events. There is no role switching—your access is based on your relationship to each object.',
    },
    {
      q: 'What happens if something goes wrong?',
      a: 'Report issues via the Contact page. We review reports and may remove content or suspend accounts. For disputes between users, we encourage direct communication; we can assist where appropriate.',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
        FAQ
      </h1>

      <div className="mt-8 space-y-6">
        {qa.map(({ q, a }, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold text-stone-900">{q}</h2>
            <p className="mt-2 text-stone-600 leading-relaxed">{a}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
