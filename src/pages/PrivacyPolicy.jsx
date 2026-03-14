export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl font-display font-semibold text-stone-900 tracking-tight">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: February 2025</p>

      <div className="mt-8 prose prose-stone max-w-none">
        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">What we collect</h2>
          <p className="text-stone-600 leading-relaxed">
            We collect account data (name, email, password hash), event and booking information,
            and data you provide when listing places or creating events. We use this to operate
            the platform and provide the services you request.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">What we do not do</h2>
          <p className="text-stone-600 leading-relaxed">
            We do not sell or share your personal data with third parties for advertising or
            marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Third parties</h2>
          <p className="text-stone-600 leading-relaxed">
            We use third-party services for hosting, database, and email delivery. Payment
            processing (when added) will be handled by a trusted provider. These services
            process data only as necessary to provide their functions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Data deletion</h2>
          <p className="text-stone-600 leading-relaxed">
            You may request deletion of your account and associated data at any time. Contact us
            via the Contact page or support email. We will process requests within a reasonable
            timeframe and confirm when completed.
          </p>
        </section>
      </div>
    </div>
  );
}
