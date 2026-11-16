/* Short intro paragraph on a dark plate (stays readable over the 3D scene). */
export default function Lede({ children }) {
  return <p className="mb-[22px] mt-0 max-w-[56ch] border-l-2 border-secondary bg-plate px-3.5 py-2.5 text-fg-2">{children}</p>;
}


