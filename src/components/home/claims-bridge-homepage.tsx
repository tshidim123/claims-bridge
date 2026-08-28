import Link from "next/link";
import type { CSSProperties } from "react";

import { ConceptIcon, type ConceptIconName } from "@/components/brand/concept-icon";
import { GlassSurface } from "@/components/glass/glass-surface";
import { ArtworkSlot } from "@/components/home/artwork-slot";
import { EligibilityPreview } from "@/components/home/eligibility-preview";
import { ApplicationContainer } from "@/components/layout/application-container";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  claimProcess,
  depositIssues,
  depositQuestions,
  evidenceCategories,
  exampleStatuses,
  homepageFaqs,
  knowledgeGuides,
  principles,
} from "@/content/homepage";
import { visualAssetTargets } from "@/content/visual-assets";

import styles from "./homepage.module.css";

const heroNodes: Array<[string, ConceptIconName]> = [
  ["Tenancy", "tenancy"],
  ["Deposit", "deposit"],
  ["Protection", "protection"],
  ["Evidence", "evidence"],
  ["Claim", "assessment"],
];

const homepageArtwork = visualAssetTargets.home;

function HeroCaseObject() {
  return (
    <div className={styles.heroObjectFallback}>
      <div className={styles.heroOrbit} aria-hidden="true" />
      <div className={styles.heroDocumentRear} aria-hidden="true" />
      <div className={styles.heroDocumentFront} aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className={styles.heroCasePlate}>
        <div className={styles.heroCaseHeader}>
          <span>Case architecture</span>
          <small>Five connected signals</small>
        </div>
        <ol className={styles.heroNodePath}>
          {heroNodes.map(([label, icon], index) => (
            <li key={label}>
              <span className={styles.heroNodeIcon}><ConceptIcon name={icon} /></span>
              <span>{label}</span>
              {index < heroNodes.length - 1 && <i aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.heroSignalLabel} aria-hidden="true">
        <span>Evidence path</span>
        <b>Connected</b>
      </div>
    </div>
  );
}

function PortalPreview() {
  return (
    <GlassSurface as="figure" className={styles.portalWindow} strength="strong">
      <div className={styles.portalChrome}>
        <div>
          <span className={styles.demoFlag}>Example interface</span>
          <strong>Claim workspace</strong>
        </div>
        <span className={styles.portalStatus}><i aria-hidden="true" /> Evidence review</span>
      </div>
      <div className={styles.portalBody}>
        <nav className={styles.portalRail} aria-label="Example claim navigation">
          {[
            ["Overview", "progress"],
            ["Evidence", "evidence"],
            ["Documents", "tenancy"],
            ["Messages", "message"],
          ].map(([label, icon], index) => (
            <span className={index === 0 ? styles.portalRailActive : undefined} key={label}>
              <ConceptIcon name={icon as ConceptIconName} />
              {label}
            </span>
          ))}
        </nav>
        <div className={styles.portalWorkspace}>
          <div className={styles.portalWorkspaceHeader}>
            <div>
              <p className="eyebrow">Demonstration only</p>
              <h3>Example claim</h3>
            </div>
            <span>Current stage · Evidence review</span>
          </div>
          <div className={styles.portalProgressPanel}>
            <div className={styles.portalProgressCopy}>
              <span>Evidence provided</span>
              <strong>3 of 5 requested documents</strong>
            </div>
            <div
              aria-label="3 of 5 requested documents provided"
              aria-valuemax={5}
              aria-valuemin={0}
              aria-valuenow={3}
              className={styles.portalProgressBar}
              role="progressbar"
            >
              <span />
            </div>
          </div>
          <div className={styles.portalNextAction}>
            <span className={styles.portalActionIcon}><ConceptIcon name="evidence" /></span>
            <div>
              <small>Next action</small>
              <strong>Upload requested evidence</strong>
              <p>The document request and any supporting guidance would appear here.</p>
            </div>
            <Icon name="arrow" />
          </div>
          <div className={styles.portalMiniTimeline} aria-label="Example progress summary">
            <span className={styles.portalMiniComplete}>Initial check</span>
            <span className={styles.portalMiniComplete}>Initial review</span>
            <span className={styles.portalMiniCurrent}>Evidence</span>
            <span>Assessment</span>
          </div>
        </div>
      </div>
      <figcaption className={styles.visuallyHidden}>
        Example Claims Bridge account interface showing a neutral evidence review stage and a request to upload evidence.
      </figcaption>
    </GlassSurface>
  );
}

function EvidenceFallback() {
  return (
    <div className={styles.evidenceFallback}>
      <div className={styles.evidenceSpine} aria-hidden="true"><span /><span /><span /><span /></div>
      <ol>
        {evidenceCategories.map((category, index) => (
          <li key={category} style={{ "--evidence-index": index } as CSSProperties}>
            <span className={styles.evidenceDocumentIcon}><ConceptIcon name="evidence" /></span>
            <span><b>{String(index + 1).padStart(2, "0")}</b>{category}</span>
            <i>{index < 3 ? "Example type" : "Communication"}</i>
          </li>
        ))}
      </ol>
      <div className={styles.evidenceLock} aria-hidden="true"><ConceptIcon name="protection" /></div>
    </div>
  );
}

export function ClaimsBridgeHomepage() {
  return (
    <div className={styles.homepage}>
      <section className={styles.hero} aria-labelledby="homepage-title">
        <div className={styles.heroArchitecture} aria-hidden="true"><span /><span /><span /></div>
        <ApplicationContainer className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className="eyebrow">Tenancy deposit clarity, connected</p>
            <h1 id="homepage-title">
              <span>Your deposit.</span>
              <span>Your tenancy.</span>
              <em>Know where you stand.</em>
            </h1>
            <div className={styles.heroLowerCopy}>
              <p>
                Claims Bridge helps private renters understand whether the way a tenancy deposit was handled may warrant further assessment—and provides a clearer route through evidence, review and progress.
              </p>
              <div className={styles.heroActions}>
                <ButtonLink href="/check-eligibility" size="large">Check My Eligibility</ButtonLink>
                <ButtonLink href="/how-it-works" size="large" variant="glass">
                  See How It Works <Icon name="arrow" />
                </ButtonLink>
              </div>
              <Link className={styles.trackLink} href="/account">
                Sign in / track an existing claim <Icon name="arrow" />
              </Link>
            </div>
          </div>

          <figure className={styles.heroFigure}>
            <ArtworkSlot
              className={styles.heroArtworkSlot}
              decorative
              fit={homepageArtwork.hero.fit}
              futureMobileSrc={homepageArtwork.hero.mobile.src}
              futureSrc={homepageArtwork.hero.desktop.src}
              mobileObjectPosition={homepageArtwork.hero.mobileObjectPosition}
              objectPosition={homepageArtwork.hero.objectPosition}
              preload
              quality={homepageArtwork.hero.quality}
              sizes={homepageArtwork.hero.sizes}
            >
              <HeroCaseObject />
            </ArtworkSlot>
            <figcaption>
              <span>Tenancy</span><i aria-hidden="true" /><span>Evidence</span><i aria-hidden="true" /><span>Clarity</span>
            </figcaption>
          </figure>
        </ApplicationContainer>
        <a className={styles.heroChapterLink} href="#the-question">
          <span>Begin the path</span><i aria-hidden="true" />
        </a>
      </section>

      <section className={styles.questionSection} id="the-question" aria-labelledby="question-title">
        <ApplicationContainer className={styles.questionInner}>
          <div className={styles.questionIntro}>
            <p className="eyebrow">The first uncertainty</p>
            <h2 id="question-title">Do you know what happened to your deposit?</h2>
            <p>Three broad questions can help identify what may need closer attention. They are prompts for assessment, not legal conclusions.</p>
          </div>
          <ol className={styles.questionSequence}>
            {depositQuestions.map((item) => (
              <li key={item.index}>
                <span>{item.index}</span>
                <div><h3>{item.question}</h3><p>{item.explanation}</p></div>
              </li>
            ))}
          </ol>
        </ApplicationContainer>
      </section>

      <section className={styles.eligibilitySection} aria-labelledby="eligibility-title">
        <ApplicationContainer className={styles.eligibilityLayout}>
          <div className={styles.eligibilityIntro}>
            <p className="eyebrow">A guided starting point</p>
            <h2 id="eligibility-title">Start with what you remember.</h2>
            <p>You do not need to understand the law or have every document before beginning an initial check.</p>
            <span className={styles.sectionMarker}>Check · Evidence · Assessment</span>
          </div>
          <GlassSurface className={styles.eligibilityGlass} strength="strong">
            <EligibilityPreview />
          </GlassSurface>
        </ApplicationContainer>
      </section>

      <section className={styles.issuesSection} aria-labelledby="issues-title">
        <ApplicationContainer className={styles.issuesLayout}>
          <div className={styles.issuesIntro}>
            <p className="eyebrow">What may have gone wrong</p>
            <h2 id="issues-title">Different records can point to different questions.</h2>
            <p>Each route explains an issue that may be relevant, depending on the tenancy and evidence available.</p>
            <Link className="text-link" href="/deposit-claims">Explore all deposit issues <Icon name="arrow" /></Link>
          </div>
          <ol className={styles.issueIndex}>
            {depositIssues.map((issue) => (
              <li key={issue.href}>
                <Link href={issue.href}>
                  <span className={styles.issueNumber}>{issue.index}</span>
                  <span className={styles.issueCopy}><strong>{issue.title}</strong><small>{issue.description}</small></span>
                  <span className={styles.issueArrow}><Icon name="arrow" /></span>
                </Link>
              </li>
            ))}
          </ol>
        </ApplicationContainer>
      </section>

      <section className={styles.processSection} aria-labelledby="process-title">
        <ApplicationContainer>
          <div className={styles.processHeading}>
            <p className="eyebrow">How Claims Bridge works</p>
            <h2 id="process-title">A connected route, with every hand-off in view.</h2>
            <p>The operational pathway will remain configurable, but the principle is fixed: each stage should explain the next.</p>
          </div>
          <div className={styles.processMap}>
            <svg aria-hidden="true" className={styles.processPath} preserveAspectRatio="none" viewBox="0 0 1200 450">
              <path d="M40 100 C210 100 215 210 390 210 S570 75 750 75 S920 330 1160 330" />
            </svg>
            <ol>
              {claimProcess.map(([number, title, description], index) => (
                <li className={styles[`processStep${index + 1}`]} key={number}>
                  <span className={styles.processNode}>{number}</span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <Link className="text-link" href="/how-it-works">See the process in detail <Icon name="arrow" /></Link>
        </ApplicationContainer>
      </section>

      <section className={styles.visibilitySection} aria-labelledby="visibility-title">
        <ApplicationContainer className={styles.visibilityLayout}>
          <div className={styles.visibilityIntro}>
            <p className="eyebrow">Client visibility</p>
            <h2 id="visibility-title">Your claim shouldn’t disappear into an inbox.</h2>
            <p>Claims Bridge is being designed as one place to understand the current stage, see the next action and keep evidence, messages and updates connected.</p>
            <ul>
              <li>Current stage and next action</li>
              <li>Claim timeline and updates</li>
              <li>Documents and evidence requests</li>
              <li>Messages and notifications</li>
            </ul>
          </div>
          <div className={styles.portalStage}>
            <ArtworkSlot
              className={styles.portalArtworkSlot}
              decorative
              fit={homepageArtwork.portalAtmosphere.fit}
              futureMobileSrc={homepageArtwork.portalAtmosphere.mobile.src}
              futureSrc={homepageArtwork.portalAtmosphere.desktop.src}
              mobileObjectPosition={homepageArtwork.portalAtmosphere.mobileObjectPosition}
              objectPosition={homepageArtwork.portalAtmosphere.objectPosition}
              quality={homepageArtwork.portalAtmosphere.quality}
              sizes={homepageArtwork.portalAtmosphere.sizes}
            >
              <div className={styles.portalAtmosphere} />
            </ArtworkSlot>
            <PortalPreview />
          </div>
        </ApplicationContainer>
      </section>

      <section className={styles.evidenceSection} aria-labelledby="evidence-title">
        <ApplicationContainer className={styles.evidenceLayout}>
          <ArtworkSlot
            className={styles.evidenceArtworkSlot}
            decorative
            fit={homepageArtwork.evidenceVault.fit}
            futureMobileSrc={homepageArtwork.evidenceVault.mobile.src}
            futureSrc={homepageArtwork.evidenceVault.desktop.src}
            mobileObjectPosition={homepageArtwork.evidenceVault.mobileObjectPosition}
            objectPosition={homepageArtwork.evidenceVault.objectPosition}
            quality={homepageArtwork.evidenceVault.quality}
            sizes={homepageArtwork.evidenceVault.sizes}
          >
            <EvidenceFallback />
          </ArtworkSlot>
          <div className={styles.evidenceIntro}>
            <p className="eyebrow">Evidence system</p>
            <h2 id="evidence-title">One place for the records that may matter.</h2>
            <p>A future Document Vault will help renters organise relevant documents by purpose, track what has been requested and understand what may still be missing.</p>
            <p className={styles.evidenceNote}>Document categories and review states will remain flexible as the service workflow is finalised.</p>
            <Link className="text-link" href="/guides/deposit-protection">View the evidence guide <Icon name="arrow" /></Link>
          </div>
        </ApplicationContainer>
      </section>

      <section className={styles.statusSection} aria-labelledby="status-title">
        <ApplicationContainer className={styles.statusLayout}>
          <div className={styles.statusIntro}>
            <p className="eyebrow">Know what happens next</p>
            <h2 id="status-title">Progress should be visible, not inferred.</h2>
            <p>The client platform is intended to show what has happened, what is happening and where an action may be needed—without implying a guaranteed outcome.</p>
          </div>
          <div className={styles.statusDemonstration}>
            <div className={styles.statusDemoHeader}>
              <span className={styles.demoFlag}>Example status path</span>
              <span>Illustrative only</span>
            </div>
            <ol>
              {exampleStatuses.map((status, index) => (
                <li className={styles[`status${status.state}`]} key={status.label}>
                  <span className={styles.statusNode}>{index + 1}</span>
                  <div><strong>{status.label}</strong><small>{status.state === "current" ? "Current example stage" : status.state === "complete" ? "Example stage complete" : "Stage to be confirmed"}</small></div>
                </li>
              ))}
            </ol>
          </div>
        </ApplicationContainer>
      </section>

      <section className={styles.knowledgeSection} aria-labelledby="knowledge-title">
        <ApplicationContainer>
          <div className={styles.knowledgeHeading}>
            <div><p className="eyebrow">Knowledge Hub</p><h2 id="knowledge-title">Understand the issue before deciding what to do.</h2></div>
            <p>Foundational guide routes—prepared for the future editorial and legal review workflow.</p>
          </div>
          <div className={styles.knowledgeIndex}>
            {knowledgeGuides.map((guide, index) => (
              <article key={guide.title}>
                <Link href={guide.href}>
                  <span className={styles.knowledgeArtwork} data-future-artwork-slot="true" aria-hidden="true"><i>{String(index + 1).padStart(2, "0")}</i></span>
                  <span className={styles.knowledgeCopy}>
                    <small>{guide.category} · Foundational guide</small>
                    <strong>{guide.title}</strong>
                    <p>{guide.description}</p>
                  </span>
                  <Icon name="arrow" />
                </Link>
              </article>
            ))}
          </div>
          <div className={styles.knowledgeActions}>
            <Link className="text-link" href="/blog">Visit the Knowledge Hub <Icon name="arrow" /></Link>
            <Link className="text-link" href="/resources">Browse resources <Icon name="arrow" /></Link>
          </div>
        </ApplicationContainer>
      </section>

      <section className={styles.trustSection} aria-labelledby="trust-title">
        <ApplicationContainer className={styles.trustLayout}>
          <div className={styles.trustStatement}>
            <p className="eyebrow">The Claims Bridge approach</p>
            <h2 id="trust-title">Trust is built by making the process legible.</h2>
            <p>Claims Bridge is designed around careful assessment, clear communication and client visibility—not promises about results.</p>
            <ButtonLink href="/why-claims-bridge" variant="glass">Why Claims Bridge <Icon name="arrow" /></ButtonLink>
            <Link className="text-link" href="/security">Security and privacy <Icon name="arrow" /></Link>
          </div>
          <ol className={styles.principlesList}>
            {principles.map(([title, description], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ol>
        </ApplicationContainer>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-title">
        <ApplicationContainer className={styles.faqLayout}>
          <div className={styles.faqIntro}>
            <p className="eyebrow">Questions, made clearer</p>
            <h2 id="faq-title">A useful starting point.</h2>
            <p>These general answers are not a conclusion about an individual tenancy. A fuller assessment depends on the circumstances.</p>
            <Link className="text-link" href="/resources/faqs">Read all FAQs <Icon name="arrow" /></Link>
          </div>
          <div className={styles.faqList}>
            {homepageFaqs.map((faq, index) => (
              <details key={faq.question}>
                <summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{faq.question}</strong><i aria-hidden="true" /></summary>
                <div><p>{faq.answer}</p></div>
              </details>
            ))}
          </div>
        </ApplicationContainer>
      </section>

      <section className={styles.finalSection} aria-labelledby="final-title">
        <ApplicationContainer>
          <GlassSurface className={styles.finalGlass} strength="strong">
            <div className={styles.finalPath} aria-hidden="true"><span /><span /><span /></div>
            <div className={styles.finalCopy}>
              <p className="eyebrow">Your first step</p>
              <h2 id="final-title">Start with what you know.</h2>
              <p>You do not need to diagnose the legal issue before beginning. Share the facts you have, and the initial pathway can help organise what may need attention.</p>
            </div>
            <div className={styles.finalActions}>
              <ButtonLink href="/check-eligibility" size="large">Check My Eligibility</ButtonLink>
              <ButtonLink href="/how-it-works" size="large" variant="glass">See How It Works</ButtonLink>
              <Link className={styles.trackLink} href="/account">Track My Claim <Icon name="arrow" /></Link>
            </div>
          </GlassSurface>
        </ApplicationContainer>
      </section>
    </div>
  );
}
