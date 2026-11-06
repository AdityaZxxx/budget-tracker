import Link from "next/link";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="Sora"
      className={cn("flex items-center", className)}
    >
      <svg
        viewBox="35.5 -24 304 304"
        className="h-8 w-8 fill-current text-foreground"
        aria-hidden="true"
        focusable="false"
      >
        <g transform="translate(0.000000,326.000000) scale(0.100000,-0.100000)">
          <path
            d="M1815 3235 c-356 -77 -700 -236 -959 -445 -242 -196 -370 -472 -323
-696 32 -150 126 -283 240 -338 138 -68 259 -51 462 65 99 56 303 191 459 303
394 284 695 423 976 451 68 7 140 33 174 63 30 27 56 93 56 146 0 74 -55 170
-147 256 -88 82 -250 167 -380 200 -122 30 -404 28 -558 -5z M2560 2326 c-203 -45 -379 -138 -740 -392 -381 -267 -487 -331 -650
-397 -111 -44 -180 -62 -323 -86 -175 -30 -235 -70 -274 -183 -18 -53 -11 -95
29 -170 72 -136 252 -263 476 -337 251 -84 569 -82 901 5 257 67 514 181 726
323 235 157 374 302 468 490 52 104 52 104 55 243 4 138 4 138 -39 226 -69
142 -183 235 -344 278 -61 17 -210 16 -285 0z"
          />
        </g>
      </svg>
    </Link>
  );
}
