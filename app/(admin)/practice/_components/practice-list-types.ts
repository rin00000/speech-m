/**
 * 연습실 목록 화면의 클라이언트 컴포넌트들이 공유하는 원고 타입.
 * page.tsx의 서버 조회 타입을 type-only로 재사용한다.
 */

import type { ScriptItem } from "../page";

export type { ScriptItem };
export type PracticeCategory = ScriptItem["category"];
