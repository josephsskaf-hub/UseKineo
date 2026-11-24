import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import { CITATION_FORMAT_HERO, type CitationFormatSlug } from '@/lib/growth/citationFormatHero2411'

export default function CitationFormatHero({ slug, examplePrompt }: { slug: CitationFormatSlug; examplePrompt: string }) {
  const example = CITATION_FORMAT_HERO[slug]
  return (
    <section className="cfh-2411" data-citation-format={slug} aria-label="Start your film with an idea">
      <div className="cfh-form">
        <TopicGeneratorForm formId={`citation-format-${slug}`} campaign={`intent_${slug}`} source={`intent_${slug}`}
          creationIntent="trial_best" scriptMode="ai" preserveHandoffForSignedIn marginTop={0} examples={[examplePrompt]}
          copy={{
            label: "What's your film about?",
            placeholder: 'Describe the story you want to make',
            submit: 'Continue with my idea →',
            examplesLabel: 'Try this story idea',
            note: 'Your idea stays attached through signup. Review the script, model, length and credits in the Studio before generating.',
          }} />
      </div>
      <figure>
        <video src={example.src} poster={example.poster} controls muted playsInline preload="metadata" aria-label={example.title} />
        <figcaption><strong>{example.title}</strong>{example.badge}<br />Example made with Kineo</figcaption>
      </figure>
    </section>
  )
}
