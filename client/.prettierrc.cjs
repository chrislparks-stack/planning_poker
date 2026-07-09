module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "none",
  tabWidth: 2,
  // "auto" keeps the checked-out line endings; git (core.autocrlf) already
  // normalizes to LF in the repo, and forcing "lf" makes prettier flag every
  // line of a Windows checkout
  endOfLine: "auto",
  htmlWhitespaceSensitivity: "ignore"
};
