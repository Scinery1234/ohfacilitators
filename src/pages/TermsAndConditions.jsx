export default function TermsAndConditions() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
        Terms &amp; Conditions
      </h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: February 2025</p>

      <div className="mt-8 prose prose-stone max-w-none">
        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Platform role</h2>
          <p className="text-stone-600 leading-relaxed">
            We are a facilitator, not an organiser. We provide tools for people to list places,
            create events, and manage bookings. We do not control, endorse, or assume
            responsibility for events or places listed by users.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">User responsibilities</h2>
          <p className="text-stone-600 leading-relaxed">
            You are responsible for the accuracy of information you provide, compliance with
            local laws, and the conduct of events and places you manage. You must not list
            unlawful events or misuse the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Event and place liability</h2>
          <p className="text-stone-600 leading-relaxed">
            Liability for events and places rests with the organisers and place managers. We
            disclaim liability for any loss, injury, or damage arising from your use of the
            platform or attendance at events.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Moderation and removal</h2>
          <p className="text-stone-600 leading-relaxed">
            We reserve the right to remove content, suspend accounts, or take other action when
            content or conduct violates our Community Guidelines or applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Verification disclaimer</h2>
          <p className="text-stone-600 leading-relaxed">
            Verification indicates we have confirmed identity to a defined standard. It does not
            guarantee safety, quality, or endorsement of events or places. Use your own
            judgment.
          </p>
        </section>
      </div>
    </div>
  );
}
