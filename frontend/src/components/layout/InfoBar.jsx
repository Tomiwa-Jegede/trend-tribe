// src/components/layout/InfoBar.jsx
import { motion, useReducedMotion } from "framer-motion";

const INFO_ITEMS = [
  { icon: "🎓", text: "Students only" },
  { icon: "🤝", text: "Meet on campus" },
  { icon: "🔒", text: "Safe peer-to-peer trading" },
  { icon: "⚡", text: "List in 60 seconds" },
  { icon: "🛍️", text: "Fashion, perfumes, electronics & more" },
  { icon: "📍", text: "Trade within your university" },
  { icon: "🧾", text: "No middlemen" },
  { icon: "🎯", text: "Built for campus life" },
];

const InfoBar = () => {
  const reduced = useReducedMotion();
  const doubled = [...INFO_ITEMS, ...INFO_ITEMS];

  return (
    <div
      style={{
        background: "#0a1628",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
        position: "relative",
        paddingTop: "14px",
        paddingBottom: "14px",
      }}
    >
      <div aria-hidden="true" style={{ position:"absolute",left:0,top:0,bottom:0,width:"80px",background:"linear-gradient(90deg, #0a1628 0%, transparent 100%)",zIndex:2,pointerEvents:"none" }} />
      <div aria-hidden="true" style={{ position:"absolute",right:0,top:0,bottom:0,width:"80px",background:"linear-gradient(270deg, #0a1628 0%, transparent 100%)",zIndex:2,pointerEvents:"none" }} />

      <motion.div
        className="flex items-center"
        animate={reduced ? {} : { x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {doubled.map((item, i) => (
          <div key={i} className="inline-flex items-center flex-shrink-0">
            <div className="inline-flex items-center gap-2 px-6">
              <span style={{ fontSize: "15px" }}>{item.icon}</span>
              <span style={{ fontSize:"13px",fontWeight:500,color:"rgba(255,255,255,0.55)",whiteSpace:"nowrap",letterSpacing:"0.01em" }}>
                {item.text}
              </span>
            </div>
            <span style={{ width:"3px",height:"3px",borderRadius:"50%",background:"rgba(245,197,24,0.4)",flexShrink:0 }} />
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default InfoBar;
