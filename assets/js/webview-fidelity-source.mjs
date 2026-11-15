// Owner-authored format sample, not a circuit or a third-party hardware design.
export function fidelitySource({advanced=false}={}) {
  const text=(value,x,y,extra='')=>`(text ${JSON.stringify(value)} (at ${x} ${y} 0) (effects (font (size 1.5 1) ${extra})))`;
  const cell=(value,x,y)=>`(table_cell ${JSON.stringify(value)} (at ${x} ${y} 0) (size 40 10) (margins 1 1 1 1) (span 1 1) (effects (font (size 1 1)) (justify left top)))`;
  return `(kicad_sch (version 20250114) (generator "eeschema") (uuid "541b4bc7-66dd-40e8-81e9-fb05b197336a") (paper "A5")
    (title_block (title "Drawing fidelity sample") (rev "1") (company "Wayri"))
    (rectangle (start 12 12) (end 108 68) (stroke (width .3) (type dash) (color 30 140 170 1)) (fill (type none)))
    (circle (center 95 23) (radius 5) (stroke (width .5) (type default) (color 180 80 40 1)) (fill (type none)))
    ${text('Saved styles / non-square text',18,20,'bold')}
    ${text('OVERBAR: ~{RESET}   Ω μ ±',18,30)}
    ${text(advanced?'Project: ${ORG}':'Saved text, colors and dashes',18,40)}
    ${text(advanced?'Numeric expression: @{pow(2,3)+sqrt(16)}':'Browser font metrics; native layout may differ',18,50)}
    ${advanced?`(table (column_count 2) (border (external yes) (header yes) (stroke (width .25) (type default))) (separators (rows yes) (cols yes) (stroke (width .15) (type default))) (column_widths 40 40) (row_heights 10 10) (uuid "c62ae054-e032-4c84-8650-7060f2d7b1a5") (cells ${cell('Saved field',18,80)} ${cell('Value',58,80)} ${cell('Voltage / V',18,90)} ${cell('@{3*4}',58,90)}))`:''}
  )`;
}
export function fidelityCapabilities(api) {
  const prototype=api?.Viewer?.prototype;
  return {advanced:typeof prototype?.openInset==='function',panels:typeof prototype?.setInspectorWidth==='function'};
}
