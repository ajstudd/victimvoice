import Image from "next/image";

/** The approved helping hands mark. Wordmarks are rendered separately as text. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/brand/helping-hands.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      style={{
        display: "block",
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: "#FBF7F2",
        borderRadius: Math.round(size * 0.22),
        padding: Math.round(size * 0.06),
        boxSizing: "border-box",
      }}
    />
  );
}
