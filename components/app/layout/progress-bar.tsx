"use client";

/**
 * 전역 페이지 전환 Progress Bar 컴포넌트.
 * next-nprogress-bar 라이브러리를 사용하며, periwinkle-600 컬러로 커스터마이징.
 * app/layout.tsx 에서 <body> 최상단에 삽입하여 모든 <Link> 전환에 자동 적용.
 * AppProgressBar는 useRouter.push() 기반 전환도 감지한다.
 */

import { AppProgressBar as NProgressBar } from "next-nprogress-bar";

export const ProgressBar = () => (
  <NProgressBar
    height="2.5px"
    color="#4d72b3"
    options={{
      showSpinner: false,
      speed: 400,
      trickleSpeed: 200,
      minimum: 0.08,
    }}
    shallowRouting
    style={`
      #nprogress {
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 999999 !important;
        pointer-events: none;
      }
      #nprogress .bar {
        background: linear-gradient(to right, #4d72b3, #6a8fbd, #4d72b3);
        box-shadow: 0 0 8px #4d72b3, 0 0 4px #4d72b380;
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100%;
        height: 2.5px;
        z-index: 999999 !important;
      }
      #nprogress .peg {
        box-shadow: 0 0 10px #4d72b3, 0 0 5px #4d72b3;
      }
    `}
  />
);

