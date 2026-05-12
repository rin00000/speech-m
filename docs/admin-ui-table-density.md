# 관리자 테이블 밀도·sticky 패턴

## 현황

데이터가 긴 **표 형태**는 현재 [components/admin/jobs/jobs-table.tsx](../components/admin/jobs/jobs-table.tsx) 한 곳뿐이다. 스크롤 영역(`max-h` + `overflow-auto`), sticky 헤더, **촘촘함 / 여유** 밀도 토글이 여기에만 적용되어 있다.

## 다른 화면에 적용할 때

- 목록이 길어 세로 스크롤이 생기는 **다른 관리자 테이블**이 생기면, 동일한 래퍼·헤더·툴바 패턴을 복제하거나 그때 공통 컴포넌트 추출을 검토한다.
- 카드·리스트만 있는 화면에는 강제하지 않는다.
