import { Link } from "react-router-dom";
import { FiShoppingBag } from "react-icons/fi";

const Footer = () => {
  return (
    <footer className="bg-primary-900 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          {/* Brand */}
          <div className="max-w-xs">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/30">
                <FiShoppingBag className="text-white w-4 h-4" />
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
