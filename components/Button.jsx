export default function Button({
  variant = "default",
  size = "md",
  className = "",
  type = "button",
  children,
  ...props
}) {
  const classes = [
    "btn",
    variant !== "default" ? variant : "",
    size === "sm" ? "small" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
