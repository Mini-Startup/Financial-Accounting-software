import type { ComponentProps } from 'react';

type SvgProps = ComponentProps<'svg'>;

function baseProps(props: SvgProps): SvgProps {
  return {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...props,
  };
}

export function IconDashboard(props: SvgProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 13h8V3H3v10z" />
      <path d="M13 21h8V11h-8v10z" />
      <path d="M13 3h8v6h-8V3z" />
      <path d="M3 21h8v-6H3v6z" />
    </svg>
  );
}

export function IconBuilding(props: SvgProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h.01" />
      <path d="M9 13h.01" />
      <path d="M9 17h.01" />
      <path d="M15 9h.01" />
      <path d="M15 13h.01" />
      <path d="M15 17h.01" />
    </svg>
  );
}

export function IconUsers(props: SvgProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconFileText(props: SvgProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

export function IconLandmark(props: SvgProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 21h18" />
      <path d="M6 21V9" />
      <path d="M10 21V9" />
      <path d="M14 21V9" />
      <path d="M18 21V9" />
      <path d="M4 7h16" />
      <path d="M12 3l8 4H4l8-4z" />
    </svg>
  );
}

export function IconPercent(props: SvgProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M19 5L5 19" />
      <path d="M7 7h.01" />
      <path d="M17 17h.01" />
    </svg>
  );
}

export function IconBook(props: SvgProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function IconTrades(props: SvgProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M7 7h10" />
      <path d="M7 17h10" />
      <path d="M7 7l-3 3 3 3" />
      <path d="M17 17l3-3-3-3" />
    </svg>
  );
}

export function IconUpload(props: SvgProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

