import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0E0D0B] text-[#F4EFE6] font-sans selection:bg-[#FF8A3D] selection:text-[#0E0D0B] py-20 px-6">
      <div className="max-w-3xl mx-auto bg-[#181613] p-8 md:p-12 rounded-2xl border border-[#332E27] shadow-xl">
        
        <div className="mb-10">
          <Link href="/" className="text-[#9C9488] hover:text-[#FF8A3D] transition-colors text-sm font-medium">
            &larr; Back to Kiro
          </Link>
        </div>

        <h1 className="text-4xl md:text-5xl font-serif mb-4 tracking-tight">Privacy Policy</h1>
        <p className="text-[#9C9488] mb-12 italic font-light text-sm">Last updated: June 28, 2026</p>

        <div className="prose prose-invert max-w-none prose-headings:font-serif prose-headings:font-medium prose-a:text-[#FF8A3D] prose-a:no-underline hover:prose-a:underline prose-p:text-[#D4CFC4] prose-p:leading-relaxed prose-li:text-[#D4CFC4] marker:text-[#FF8A3D]">
          <p>
            This Privacy Policy explains how Kiro ("Kiro," "we," "us," or "our") collects, uses, stores,
            and shares information when you use our task management and AI-assisted scheduling
            application (the "Service").
          </p>
          <p>
            If you do not agree with this policy, please do not use the Service.
          </p>

          <hr className="border-[#332E27] my-8" />

          <h2 className="text-2xl mt-10 mb-4 text-[#F4EFE6]">1. Information We Collect</h2>

          <h3 className="text-xl mt-6 mb-2 text-[#E6E0D4]">1.1 Account Information</h3>
          <p>
            We use <strong>Clerk</strong> as our authentication provider. When you sign up, Clerk collects and
            processes information such as your name, email address, and authentication credentials
            (or third-party sign-in details if you use Google/GitHub/etc. login). Clerk's own
            privacy practices are described at their privacy policy, which we encourage you to review:{" "}
            <a href="https://clerk.com/legal/privacy" target="_blank" rel="noopener noreferrer">https://clerk.com/legal/privacy</a>.
          </p>

          <h3 className="text-xl mt-6 mb-2 text-[#E6E0D4]">1.2 Task and Productivity Data</h3>
          <p>
            We store the content you create in Kiro, including but not limited to: tasks, projects,
            deadlines, schedules, habit data, day logs, and related metadata. This data is retained{" "}
            <strong>long-term</strong> in our database so the Service can function (e.g., scheduling, neglect
            scoring, dependency tracking).
          </p>

          <h3 className="text-xl mt-6 mb-2 text-[#E6E0D4]">1.3 Conversation Data</h3>
          <p>
            Kiro includes an AI assistant ("Yuki") and related agents. When you interact with these
            agents, we store your <strong>messages and the assistant's responses</strong> as conversation history,
            so the Service can maintain context across sessions. This data is also retained long-term.
          </p>

          <h3 className="text-xl mt-6 mb-2 text-[#E6E0D4]">1.4 Cookies</h3>
          <p>
            We use cookies set by Clerk to maintain your login session. We do not currently use
            cookies for advertising, marketing, or analytics purposes, and we do not currently use any
            third-party analytics or tracking tools.
          </p>

          <hr className="border-[#332E27] my-8" />

          <h2 className="text-2xl mt-10 mb-4 text-[#F4EFE6]">2. How We Use Your Information</h2>
          <p>We use the information described above to:</p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Provide, operate, and maintain the Service (scheduling, task tracking, AI chat features)</li>
            <li>Authenticate you and keep your account secure</li>
            <li>Generate AI responses and recommendations based on your tasks and conversation history</li>
            <li>Improve and debug the Service</li>
          </ul>
          <p>
            We do <strong>not</strong> sell your personal information, and we do not use your data for
            third-party advertising.
          </p>

          <hr className="border-[#332E27] my-8" />

          <h2 className="text-2xl mt-10 mb-4 text-[#F4EFE6]">3. Sharing Your Information</h2>
          <p>
            We share information with the following categories of third parties, only as necessary
            to operate the Service:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-4">
            <li>
              <strong>Authentication provider (Clerk):</strong> processes your account/login information.
            </li>
            <li>
              <strong>AI service providers (Groq, Google Gemini):</strong> we use these providers for different,
              specific purposes, and what is sent to each differs accordingly:
              <ul className="list-[circle] pl-6 mt-2 space-y-2 text-[#9C9488]">
                <li>
                  <strong>Groq</strong> is primarily used for <strong>intent classification</strong> &mdash; determining what kind of
                  request you're making so Kiro can route it correctly. This typically involves sending
                  the text of your message. In some cases, fulfilling a request involves a tool call
                  that may include relevant user data (such as task or project details) necessary to
                  complete that specific action.
                </li>
                <li>
                  <strong>Google Gemini</strong> is used for <strong>chat summarization</strong> and has access to your{" "}
                  <strong>conversation/chat history</strong> in order to generate summaries and maintain context
                  across your sessions with Kiro's AI agents.
                </li>
              </ul>
              <p className="mt-2 text-sm text-[#9C9488]">
                Data sent to either provider is limited to what is necessary for that specific feature
                to function. These providers process this data under their own privacy and
                data-handling terms; we encourage you to review their policies directly if you'd like
                more detail (
                <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer">Groq</a>,{" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's privacy policy</a>
                ).
              </p>
            </li>
            <li>
              <strong>Hosting (Vercel):</strong> the Service's application/frontend is hosted on Vercel. Vercel may
              serve and process requests through infrastructure located in various regions as part of
              its normal operation. Vercel acts as our infrastructure provider &mdash; we remain responsible
              for how your data is handled within the Service, including the data that passes through
              Vercel's hosting layer.
            </li>
            <li>
              <strong>Database (Turso):</strong> your task, schedule, and conversation data is stored in our
              database, hosted via Turso, with our primary database location in <strong>Delhi, India</strong>.
            </li>
          </ul>
          <p>We do not otherwise share, rent, or sell your personal data to third parties.</p>

          <hr className="border-[#332E27] my-8" />

          <h2 className="text-2xl mt-10 mb-4 text-[#F4EFE6]">4. Data Retention</h2>
          <p>
            We currently retain account, task, and conversation data for as long as your account is
            active, so that Kiro's features (history, scoring, scheduling context) continue to work
            as intended. We are working on building self-service data export and deletion tools.
            Until those are available, you can request deletion as described in Section 6 below.
          </p>

          <hr className="border-[#332E27] my-8" />

          <h2 className="text-2xl mt-10 mb-4 text-[#F4EFE6]">5. Data Security</h2>
          <p>
            We take reasonable steps to protect your information, including relying on Clerk's
            security practices for authentication and standard hosting-provider security for our
            database and servers. However, no method of transmission or storage is 100% secure, and
            we cannot guarantee absolute security.
          </p>

          <hr className="border-[#332E27] my-8" />

          <h2 className="text-2xl mt-10 mb-4 text-[#F4EFE6]">6. Your Rights and Choices</h2>
          <p>
            Depending on where you live, you may have rights under applicable law (such as the EU/UK
            GDPR, California's CCPA, or India's Digital Personal Data Protection Act) to:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Request a copy of the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Object to or restrict certain processing of your data</li>
          </ul>
          <p>
            <strong>To make any of these requests</strong>, please contact us at{" "}
            <strong><a href="mailto:pstanwar6747@gmail.com">pstanwar6747@gmail.com</a></strong>.
            Because Kiro does not yet have a fully automated self-service deletion flow, deletion
            requests are currently handled manually. We will confirm and act on verified requests
            within a reasonable timeframe.
          </p>
          <p>
            You can also delete your underlying authentication record directly through Clerk's
            account settings, where available; note that this does not automatically delete the
            task and conversation data stored in Kiro's own database &mdash; please contact us to ensure
            that data is removed as well.
          </p>

          <hr className="border-[#332E27] my-8" />

          <h2 className="text-2xl mt-10 mb-4 text-[#F4EFE6]">7. Children's Privacy</h2>
          <p>
            The Service is not directed to children under 13 (or the relevant age of consent in your
            jurisdiction), and we do not knowingly collect personal information from children. If you
            believe a child has provided us with personal information, please contact us so we can
            remove it.
          </p>

          <hr className="border-[#332E27] my-8" />

          <h2 className="text-2xl mt-10 mb-4 text-[#F4EFE6]">8. International Users</h2>
          <p>
            Kiro is available globally. Our primary database is located in <strong>Delhi, India</strong>, and your
            task, schedule, and conversation data is stored there. Our application is hosted via
            Vercel, which may process requests through infrastructure in various regions as part of
            normal operation, and the AI providers we use (Groq, Google Gemini) may process data in
            their own respective locations. By using the Service, you understand that your
            information may be transferred to and processed in countries other than your own, which
            may have different data protection laws than your country of residence.
          </p>

          <hr className="border-[#332E27] my-8" />

          <h2 className="text-2xl mt-10 mb-4 text-[#F4EFE6]">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we will
            update the "Last updated" date above and, where appropriate, notify you through the
            Service.
          </p>

          <hr className="border-[#332E27] my-8" />

          <h2 className="text-2xl mt-10 mb-4 text-[#F4EFE6]">10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise any of the rights
            described above, contact us at:
          </p>
          <p className="font-bold text-lg text-[#F4EFE6] mt-2">
            <a href="mailto:pstanwar6747@gmail.com">pstanwar6747@gmail.com</a>
          </p>

        </div>
      </div>
    </div>
  );
}
