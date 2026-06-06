'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './landing.module.css'

const LeafIcon = ({ size = 18 }: { size?: number }) => (
  <svg className={styles.icon} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>
)

const ArrowRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
)

const slides = ['/hero-1.jpg', '/hero-2.jpg']

export default function LandingPage() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.page}>
      {/* NAV */}
      <header className={styles.nav}>
        <nav className={`${styles.container} ${styles.navInner}`}>
          <div className={styles.navLogo}>
            <div className={styles.navLogoIcon}><LeafIcon size={18} /></div>
            <div className={styles.navLogoText}>RetReach</div>
          </div>
          <div className={styles.navActions}>
            <Link href="/login" className={styles.btnGhost}>Sign in</Link>
            <Link href="/signup" className={styles.btnPrimary}>Get started</Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className={styles.hero}>
        {slides.map((src, i) => (
          <div key={src} className={styles.heroSlide} style={{ opacity: current === i ? 1 : 0 }}>
            <img src={src} alt="" />
          </div>
        ))}
        <div className={styles.heroOverlay} />
        <div className={`${styles.container} ${styles.heroContent}`}>
          <div className={`${styles.heroInner} ${styles.fadeUp}`}>
            <div className={styles.heroBadge}>
              <svg className={styles.icon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
              End-to-end retreat management
            </div>
            <h1>
              The Easiest Way<br />
              to Plan &amp; Run<br />
              <span className={styles.accent}>Your Next Retreat.</span>
            </h1>
            <p className={styles.heroSub}>
              From initial concept to event day, RetReach brings your entire production
              into one clear dashboard. No setup required.
            </p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.btnCta}>
                Build Your First Retreat
                <ArrowRight />
              </Link>
              <span className={styles.heroNote}>Free to start &middot; No credit card</span>
            </div>
          </div>
        </div>
        <div className={styles.heroFade} />
      </section>

      {/* PAIN */}
      <section className={styles.pain}>
        <div className={styles.container}>
          <div className={styles.painGrid}>
            <div className={styles.fadeUp}>
              <div className={styles.painLabel}>The problem</div>
              <h2>
                Planning a retreat is inspiring.
                <span className={styles.dim}>Running it is exhausting.</span>
              </h2>
            </div>
            <div className={`${styles.painBody} ${styles.fadeUp}`}>
              <p>We&apos;ve all been there: chasing speakers for slides at 1:00 AM, waiting days for caterers to reply, and jumping between four different Excel sheets.</p>
              <p>When you&apos;re buried under messy logistics, important details inevitably slip through the cracks &mdash; and you end up stressed instead of focused on your guests.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className={styles.solution}>
        <div className={`${styles.container} ${styles.fadeUp}`}>
          <h2>Everything managed<br />from a single screen.</h2>
          <p>RetReach takes the chaos out of event production. It connects your team, your schedule, and your partners in one automated hub &mdash; so you always know exactly what&apos;s done and what&apos;s next.</p>
        </div>
      </section>

      {/* PHASES */}
      <section className={styles.phases}>
        <div className={styles.container}>
          <div className={`${styles.phasesHeader} ${styles.fadeUp}`}>
            <div className={styles.phasesLabel}>What we provide</div>
            <h2>With you at every stage.</h2>
          </div>

          {/* Phase 01 */}
          <div className={`${styles.phase} ${styles.fadeUp}`}>
            <div className={styles.phaseText}>
              <div className={styles.phaseNumber}><span>01</span><span>Before the Retreat</span></div>
              <h3>From Spark to Launch</h3>
              <p className={styles.phaseDesc}>Set up your retreat in seconds by entering basic details like destination, dates, concept, and guest capacity. RetReach instantly does the heavy lifting.</p>
            </div>
            <div className={styles.phaseCards}>
              <div className={styles.bulletCard}>
                <div className={styles.bulletIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                </div>
                <p><strong>Smart Recommendations</strong> &mdash; We find available flights and nearby hotels for your dates.</p>
              </div>
              <div className={styles.bulletCard}>
                <div className={styles.bulletIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18H3"/><path d="m15 18 2 2 4-4"/><path d="M16 12H3"/><path d="M16 6H3"/></svg>
                </div>
                <p><strong>Instant Blueprint</strong> &mdash; Auto-generated schedule, timeline, and master task list you can edit anytime.</p>
              </div>
              <div className={styles.bulletCard}>
                <div className={styles.bulletIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="5" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
                </div>
                <p><strong>Registration Made Easy</strong> &mdash; A ready-to-share form to track sign-ups and close bookings.</p>
              </div>
            </div>
          </div>

          {/* Phase 02 */}
          <div className={`${styles.phase} ${styles.reverse} ${styles.fadeUp}`}>
            <div className={styles.phaseText}>
              <div className={styles.phaseNumber}><span>02</span><span>During the Retreat</span></div>
              <h3>Your On-Site Assistant</h3>
              <p className={styles.phaseDesc}>The big day is finally here. RetReach keeps you organized on the ground every single day.</p>
            </div>
            <div className={styles.phaseCards}>
              <div className={styles.bulletCard}>
                <div className={styles.bulletIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/></svg>
                </div>
                <p><strong>Daily Briefings</strong> &mdash; Instant overview of the day&apos;s schedule and vital timeline updates.</p>
              </div>
              <div className={styles.bulletCard}>
                <div className={styles.bulletIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></svg>
                </div>
                <p><strong>Guest Communication</strong> &mdash; Smart recommendations on exactly what to send your participants.</p>
              </div>
              <div className={styles.bulletCard}>
                <div className={styles.bulletIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                </div>
                <p><strong>Continuous Control</strong> &mdash; Master dashboard for finances, vendor contacts, schedules, and tasks.</p>
              </div>
            </div>
          </div>

          {/* Phase 03 */}
          <div className={`${styles.phase} ${styles.fadeUp}`}>
            <div className={styles.phaseText}>
              <div className={styles.phaseNumber}><span>03</span><span>After the Retreat</span></div>
              <h3>Insights &amp; Growth</h3>
              <p className={styles.phaseDesc}>Wrap up your event gracefully and build momentum for the next one.</p>
            </div>
            <div className={styles.phaseCards}>
              <div className={styles.bulletCard}>
                <div className={styles.bulletIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <p><strong>Feedback Loops</strong> &mdash; Instantly generate and distribute feedback forms to participants.</p>
              </div>
              <div className={styles.bulletCard}>
                <div className={styles.bulletIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </div>
                <p><strong>Host Debrief</strong> &mdash; Log your own notes, operational lessons, and personal feedback.</p>
              </div>
              <div className={styles.bulletCard}>
                <div className={styles.bulletIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16l4-8 4 5 4-9"/></svg>
                </div>
                <p><strong>Analytics &amp; History</strong> &mdash; Event stats, past retreats, lessons learned, and a permanent guest database.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD */}
      <section className={styles.dashboard}>
        <div className={styles.container}>
          <div className={`${styles.dashboardHeader} ${styles.fadeUp}`}>
            <div className={styles.dashboardLabel}>Access anytime, anywhere</div>
            <h3>Your master dashboard at your fingertips.</h3>
          </div>
          <div className={`${styles.dashboardGrid} ${styles.fadeUp}`}>
            <div className={styles.dashCard}>
              <div className={styles.dashIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2.468"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
              </div>
              <span>Financial health tracking</span>
            </div>
            <div className={styles.dashCard}>
              <div className={styles.dashIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <span>Quick-access vendor contacts</span>
            </div>
            <div className={styles.dashCard}>
              <div className={styles.dashIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
              </div>
              <span>Live trip schedules</span>
            </div>
            <div className={styles.dashCard}>
              <div className={styles.dashIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="5" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
              </div>
              <span>Team task management</span>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaBg} />
        <div className={`${styles.container} ${styles.finalCtaContent} ${styles.fadeUp}`}>
          <h2>Ready to stop<br />scrambling?</h2>
          <p>Join retreat producers who replaced spreadsheet chaos with one calm, automated dashboard.</p>
          <Link href="/signup" className={styles.btnCta}>
            Build your first retreat now
            <ArrowRight />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div className={styles.footerLogo}>
            <div className={styles.footerLogoIcon}><LeafIcon size={14} /></div>
            <span>RetReach</span>
          </div>
          <div className={styles.footerTagline}>End-to-end retreat management</div>
        </div>
      </footer>
    </div>
  )
}
