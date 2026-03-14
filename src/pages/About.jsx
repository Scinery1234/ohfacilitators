export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
        About
      </h1>

      <div className="mt-8 prose prose-stone max-w-none">
        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Mission</h2>
          <p className="text-stone-600 leading-relaxed">
            We connect people with places and events. Our platform exists to make it easier for
            communities to gather, host, and discover experiences.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">What we are</h2>
          <p className="text-stone-600 leading-relaxed">
            A collaborative, place-based platform. Anyone can attend events, host events, and
            manage places. Management rights come from ownership or collaboration on specific
            places and events—not from account types or gatekeeping.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">What we are not</h2>
          <p className="text-stone-600 leading-relaxed">
            We are not a marketplace with gatekeeping. We do not require you to &quot;become a host&quot; or
            apply for special status to create events or manage places. One account, one login—
            your participation is based on what you create and collaborate on.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">How you can participate</h2>
          <ul className="list-disc pl-6 space-y-2 text-stone-600">
            <li><strong>Attend</strong> — discover and book events</li>
            <li><strong>Host</strong> — create events and manage them</li>
            <li><strong>Manage</strong> — list places, invite collaborators, run events at venues</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
