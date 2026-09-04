import { Link } from "react-router-dom";
import { FiShoppingBag, FiInstagram, FiMessageCircle } from "react-icons/fi";

const Footer = () => {
  return (
    <footer className="bg-primary-900 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          {/* Brand */}
          <div className="max-w-xs">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                <img src="/trendtribe_logo.png" alt="TrendTribe" className="w-full h-full object-contain rounded-xl" />
              </div>
              <span className="font-bold text-lg text-white">
                Trend<span className="text-accent-400">Tribe</span>
              </span>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed">
              The campus marketplace built for students. Buy, sell, and trade
              safely within your university.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-4">
                Company
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "About Us", to: "/about" },
                  { label: "Contact", to: "/contact" },
                  { label: "FAQ", to: "/faq" },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-200"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-4">
                Legal
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Privacy Policy", to: "/privacy" },
                  { label: "Terms of Service", to: "/terms" },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-200"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-4">
                Community
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="https://chat.whatsapp.com/HWJAMqgI9ebITZp4CorXOm?mode=gi_t"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-white/50 hover:text-white transition-colors duration-200 inline-flex items-center gap-2"
                >
                  <FiMessageCircle className="w-4 h-4" /> WhatsApp Group
                </a>
                <a
                  href="https://www.instagram.com/trendtribe_marketplace?igsh=MWxuMnA3bzF6Y2ttbg%3D%3D&utm_source=qr"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-white/50 hover:text-white transition-colors duration-200 inline-flex items-center gap-2"
                >
                  <FiInstagram className="w-4 h-4" /> Instagram
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} TrendTribe. All rights reserved.
          </p>
          <p className="text-accent-400/60 text-xs font-medium">
            Made with ❤️ for students
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
