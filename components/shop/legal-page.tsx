interface LegalSection {
  heading: string;
  body: string[];
}

interface LegalPageProps {
  title: string;
  intro: string;
  updatedAt?: string;
  sections: LegalSection[];
}

/** Shared shell for the static informational pages (about, terms, privacy). */
export function LegalPage({ title, intro, updatedAt, sections }: LegalPageProps) {
  return (
    <div className="pt-16">
      <section className="bg-gray-50/60 border-b border-gray-100">
        <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
          <h1 className="heading-lg text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-3 leading-relaxed">{intro}</p>
          {updatedAt && (
            <p className="text-xs text-gray-400 mt-4">Última actualización: {updatedAt}</p>
          )}
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{section.heading}</h2>
              <div className="space-y-3">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-gray-600 leading-relaxed">{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
