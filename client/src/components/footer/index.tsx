import { FC } from "react";

export const Footer: FC = () => {
  return (
    <footer
      aria-labelledby="footer-heading"
      className="bg-white dark:bg-gray-900"
    >
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-8 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <a
            href="https://pokerplanning.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            PokerPlanning.org
          </a>
        </div>
      </div>
    </footer>
  );
};
