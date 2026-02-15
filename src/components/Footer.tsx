import { useMemo, useState } from "react";
import { useStore } from "../store/StoreContext";
import { supabase } from "../lib/supabase";

type LinkItem = { label: string; onClick?: () => void };

function Col({ title, links }: { title: string; links: LinkItem[] }) {
  return (
    <div className="fCol">
      <div className="fTitle">{title}</div>
      <div className="fLinks">
        {links.map((l) => (
          <a
            key={l.label}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              l.onClick?.();
            }}
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function Footer({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { dispatch } = useStore();

  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const canSubscribe = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email]
  );

  return (
    <footer className="footerLux" aria-label="Footer">
      <div className="footerInner">
        <div className="fTop">
          <div className="fAbout">
            <p>
              Our jewellery is handmade from 100% recycled silver and gold. Each piece is a sustainable and ethical
              choice, designed to feel like a signature.
            </p>
          </div>

          <Col
            title="COMPANY"
            links={[
              { label: "Our story", onClick: () => onNavigate("OUR STORY") },
              { label: "Responsibility", onClick: () => onNavigate("RESPONSIBILITY") },
              { label: "Lumière Finland", onClick: () => onNavigate("LUMIÈRE FINLAND") },
              { label: "Enchanting Treasure", onClick: () => onNavigate("ENCHANTING TREASURE") },
              { label: "Visitor Center", onClick: () => onNavigate("VISITOR CENTER") },
            ]}
          />

          <Col
            title="INFO"
            links={[
              { label: "Contact us", onClick: () => onNavigate("CONTACT") },
              { label: "Terms of use", onClick: () => onNavigate("TERMS OF USE") },
              { label: "Privacy statement", onClick: () => onNavigate("PRIVACY STATEMENT") },
              { label: "Terms of delivery", onClick: () => onNavigate("TERMS OF DELIVERY") },
              { label: "Return instructions", onClick: () => onNavigate("RETURN INSTRUCTIONS") },
              { label: "Jewelry maintenance", onClick: () => onNavigate("JEWELRY MAINTENANCE") },
            ]}
          />

          {}
          <div className="fCol newsletterCol">
            <div className="fTitle">NEWSLETTER</div>
            <div className="fNewsletter">
              <div className="muted small">
                Early access to new drops, quiet offers, and care notes for pieces you keep forever.
              </div>

              <form
                className="newsForm"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const v = email.trim();

                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
                    dispatch({ type: "toast/show", message: "Please enter a valid email." });
                    return;
                  }

                  try {
                    setIsSubscribing(true);

                    const { error } = await supabase
                      .from("newsletter_subscriptions")
                      .upsert({ email: v }, { onConflict: "email" });

                    if (error) throw error;

                    setEmail("");
                    dispatch({ type: "toast/show", message: "Subscribed. Welcome to Lumière." });
                  } catch (err: any) {
                    dispatch({
                      type: "toast/show",
                      message: err?.message ?? "Subscription failed. Try again.",
                    });
                  } finally {
                    setIsSubscribing(false);
                  }
                }}
              >
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  aria-label="Email address"
                />

                <button type="submit" className="btnPrimary" disabled={!canSubscribe || isSubscribing}>
                  {isSubscribing ? "Subscribing..." : "Subscribe"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="fBottom">
          <div className="fLocale">
            <button className="fSelect" onClick={() => onNavigate("Language (demo)")}>
              English <span aria-hidden>▾</span>
            </button>
            <button className="fSelect" onClick={() => onNavigate("Country / currency (demo)")}>
              Finland (EUR €) <span className="flag" aria-hidden>🇫🇮</span> <span aria-hidden>▾</span>
            </button>
          </div>

          <div className="fCopy">
            Copyright © {new Date().getFullYear()}, Lumière. All rights reserved. See our terms of use and privacy notice.
          </div>
        </div>
      </div>
    </footer>
  );
}