/**
 * Design-system button. Variants: primary | dark | ghost | quiet | onDark.
 * A thin wrapper over the .btn classes so intent lives in one place.
 */
export default function Button({
  variant = "ghost",
  size,
  as: Tag = "button",
  className = "",
  children,
  ...props
}) {
  const cls = [
    "btn",
    `btn--${variant}`,
    size === "lg" ? "btn--lg" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={cls} {...props}>
      {children}
    </Tag>
  );
}
