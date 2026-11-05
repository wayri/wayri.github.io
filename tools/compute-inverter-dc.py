"""Reproduce the public inverter's normalized DC copper demonstration.

Run with an existing KiCad/Quick PI scientific Python environment. This script
does not install packages or alter the PCB or the supplied Quick PI checkout.
"""
from __future__ import annotations
import argparse, datetime, hashlib, json, math, os, shutil, subprocess, sys, tempfile, time
from pathlib import Path

EXPECTED_BOARD = '09bc4def38e6d866ee38c2ba4f87c349945c3514a4f3b3195c14b89e530fa75d'
ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--quickpi-root', type=Path, required=True)
    parser.add_argument('--quickpi-revision', help='Recorded source revision when Git metadata is unavailable; per-module hashes are always recorded.')
    parser.add_argument('--board', type=Path, default=ROOT/'assets/lib/kicad-webview/demo/3PD+IB.kicad_pcb')
    parser.add_argument('--output', type=Path, default=ROOT/'assets/lib/kicad-webview/analysis')
    args = parser.parse_args()
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(args.quickpi_root.resolve()))
    # Keep any font-cache writes task-local. No shared environment is modified.
    with tempfile.TemporaryDirectory(prefix='inverter-dc-plot-') as scratch:
        os.environ['MPLCONFIGDIR'] = scratch
        import numpy as np
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        from matplotlib.collections import PolyCollection
        from matplotlib.path import Path as MplPath
        from scipy.spatial import cKDTree
        import scipy, pcbnew
        from quick_pi_plugin.service import execute
        from quick_pi_plugin.solver import solve

        digest = hashlib.sha256(args.board.read_bytes()).hexdigest()
        if digest != EXPECTED_BOARD:
            raise ValueError('This demonstration is bound to the exact published inverter revision.')
        # This bounded calculation creates small result assets; it is not a
        # disk quota or a replacement for the host's operating-reserve policy.
        # No builds, environments, package installs or downloads occur.
        free_before = shutil.disk_usage(args.output.anchor or '.').free
        print('Available GiB:', round(free_before/2**30, 2), flush=True)
        if free_before < 100*2**30:
            print('Below 100 GiB reserve: bounded essential calculation only; expected output <5 MiB.',flush=True)
        request = dict(action='solve', board_path=str(args.board.resolve()), net='Vdc',
            source_terminal='J10.1', sink_terminal='Q4.2', source_voltage=1., sink_current=1.,
            plating_mm=.025, options=dict(temperature_c=20., ambient_c=20., temperature_limit_c=105.))
        runs = []
        final = None
        for edge in [2., 1., .5]:
            started = time.monotonic()
            final = execute({**request, 'edge_mm': edge})
            mesh, result = final['mesh'], final['result']
            row = dict(edge_mm=edge, nodes=len(mesh['points_mm']), triangles=len(mesh['triangles']),
                voltage_drop_mV=result['voltage_drop_V']*1000, copper_loss_W=result['total_power_W'],
                peak_current_density_A_mm2=result['max_current_density_A_mm2'],
                current_balance_error_A=result['current_balance_error_A'],
                max_nodal_residual_A=result['max_nodal_residual_A'],
                energy_relative_error=result['energy_relative_error'],
                loss_accounting_error_W=result['analytics']['losses']['accounting_error_W'],
                seconds=round(time.monotonic()-started, 3))
            if runs:
                row['drop_change_percent'] = abs(row['voltage_drop_mV']-runs[-1]['voltage_drop_mV'])/row['voltage_drop_mV']*100
                row['peak_J_change_percent'] = abs(row['peak_current_density_A_mm2']-runs[-1]['peak_current_density_A_mm2'])/row['peak_current_density_A_mm2']*100
            runs.append(row)
            print(json.dumps(row), flush=True)
            assert row['current_balance_error_A'] < 1e-7
            assert row['energy_relative_error'] < 1e-7
            assert row['max_nodal_residual_A'] < 1e-6

        # Independent analytical rectangle with the same production solver.
        strip = dict(points_mm=[[0,0,0],[10,0,0],[0,5,0],[10,5,0]],
            triangles=[[0,1,2],[1,3,2]], triangle_thickness_mm=[.035,.035],
            triangle_layer=[0,0], vias=[])
        reference = solve(strip, [0,2], [1,3], source_voltage=1., sink_current=1.,
                          options={'temperature_c':20.})
        expected = reference['material']['resistivity_ohm_m']*.010/(.005*.000035)
        analytical = dict(length_mm=10., width_mm=5., thickness_mm=.035,
            analytical_resistance_ohm=expected, computed_resistance_ohm=reference['drop_over_current_ohm'],
            relative_error=abs(reference['drop_over_current_ohm']-expected)/expected)
        assert analytical['relative_error'] < 1e-9

        mesh, result, geometry = final['mesh'], final['result'], final['geometry']
        points = np.asarray(mesh['points_mm'])
        triangles = np.asarray(mesh['triangles'], dtype=int)
        potentials = np.asarray(result['potential_V'], dtype=float)
        selected = np.asarray(mesh['triangle_layer']) == 0
        active = np.isfinite(np.asarray(result['cell_power_W'], dtype=float))
        indices = np.flatnonzero(selected & active)
        local_tris = triangles[indices]
        xy = points[local_tris, :2]
        voltage_drop = 1000*(result['source_voltage_V']-potentials)
        vectors = np.asarray([result['cell_J_A_mm2'][i] for i in indices])
        density = np.linalg.norm(vectors, axis=1)
        mean_drop = voltage_drop[local_tris].mean(axis=1)
        max_drop = float(np.nanmax(voltage_drop))
        summary = dict(maxVoltageDropMv=max_drop, copperLossW=result['total_power_W'], currentA=1.,
            copperThicknessUm=35., sourcePad='J10.1', loadPad='Q4.2', net='Vdc', meshMm=.5,
            convergenceChangePercent=runs[-1]['drop_change_percent'],
            peakCurrentDensityAmm2=result['max_current_density_A_mm2'])

        assumptions = [
            'Normalized 1 A DC load from source pad J10.1 to load pad Q4.2 on saved net Vdc; other pads draw no external current.',
            'Source reference is 1 V. This is not the inverter operating voltage or a simulation of its documented 500 W rating.',
            'Both saved copper layers are solved together at 20 C: 35 micrometres copper per layer. Via plating is assumed 25 micrometres.',
            'Linear 2.5D DC conductivity FEM with ideal equipotential pad electrodes and copper resistivity 1.724e-8 ohm metre at 20 C.',
            'No semiconductor switching, package/contact resistance, return-path loading, AC impedance, thermal field, or measurements are included.',
            'The overlay shows F.Cu only; coupled B.Cu and plated barrel losses are included in the reported total.',
            'Displayed 2 mm sample squares are wholly inside saved copper polygons. Voltage uses FEM interpolation; current density uses the containing element.',
            'The exact static figure colors solved FEM triangles; overlay sampling does not determine the reported maxima.',
            'Mesh changes and conservation checks are numerical evidence, not measurement validation or manufacturing qualification.',
            'Local current-density peaks remain mesh/contact dependent; the refinement evidence does not certify hotspot convergence.'
        ]
        # Portable result cells. A conservative geometry check rejects boundary
        # cells rather than painting rectangular patches across empty board area.
        layer = next(row for row in geometry['layers'] if row['id'] == 0)
        polygons = [(MplPath(np.asarray(poly['outer'])), [MplPath(np.asarray(h)) for h in poly['holes']]) for poly in layer['polygons']]
        segments = []
        for poly in layer['polygons']:
            for ring in [poly['outer'], *poly['holes']]:
                ring = np.asarray(ring)
                segments.extend(zip(ring, np.roll(ring,-1,axis=0)))
        segments = np.asarray(segments)
        segment_min, segment_max = segments.min(axis=1), segments.max(axis=1)
        tree = cKDTree(xy.mean(axis=1))
        a,b,c = xy[:,0],xy[:,1],xy[:,2]
        denominator = (b[:,1]-c[:,1])*(a[:,0]-c[:,0])+(c[:,0]-b[:,0])*(a[:,1]-c[:,1])
        bounds = (float(xy[:,:,0].min()),float(xy[:,:,1].min()),float(xy[:,:,0].max()),float(xy[:,:,1].max()))
        edge = 2.
        voltage_cells, current_cells = [], []
        for y in np.arange(math.floor(bounds[1]/edge)*edge, bounds[3], edge):
            for x in np.arange(math.floor(bounds[0]/edge)*edge, bounds[2], edge):
                corners = np.asarray([[x,y],[x+edge,y],[x+edge,y+edge],[x,y+edge]])
                contained = any(outer.contains_points(corners).all() and not any(hole.contains_points(corners).any() for hole in holes) for outer,holes in polygons)
                if not contained:continue
                # Any boundary bounding box touching the cell interior causes
                # rejection. This is conservative even for oblique boundaries.
                if np.any(np.all(segment_max > [x+1e-9,y+1e-9],axis=1) & np.all(segment_min < [x+edge-1e-9,y+edge-1e-9],axis=1)):continue
                point = np.asarray([x+edge/2,y+edge/2])
                _, candidates = tree.query(point,k=min(24,len(xy)))
                chosen = None
                for candidate in np.atleast_1d(candidates):
                    l0=((b[candidate,1]-c[candidate,1])*(point[0]-c[candidate,0])+(c[candidate,0]-b[candidate,0])*(point[1]-c[candidate,1]))/denominator[candidate]
                    l1=((c[candidate,1]-a[candidate,1])*(point[0]-c[candidate,0])+(a[candidate,0]-c[candidate,0])*(point[1]-c[candidate,1]))/denominator[candidate]
                    weights=np.asarray([l0,l1,1-l0-l1])
                    if weights.min()>=-1e-8:
                        chosen=int(candidate);break
                if chosen is None:continue
                cell=dict(x=round(float(x),6),y=round(float(y),6),width=edge,height=edge)
                voltage_cells.append({**cell,'value':round(float(np.dot(weights,voltage_drop[local_tris[chosen]])),8)})
                current_cells.append({**cell,'value':round(float(density[chosen]),8)})
        assert 0<len(voltage_cells)<=5000
        provenance = dict(kind='computed',tool='WayriCAD Quick PI / linear triangular DC conductivity FEM',
            runId='inverter-vdc-unit-load-2026-11-05',generatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),assumptions=assumptions)
        dataset=dict(schema='kicad-webview.analysis/v1',coordinateSystem='kicad-mm',
            board=dict(sha256=digest,path='3PD+IB.kicad_pcb'),provenance=provenance,summary=summary,
            fields=[dict(id='voltage-drop',name='DC copper voltage drop',unit='mV',layer='F.Cu',range=[0,math.ceil(max_drop*10)/10],samples=voltage_cells),
                    dict(id='current-density',name='DC current density',unit='A/mm²',layer='F.Cu',range=[0,math.ceil(float(density.max()))],samples=current_cells)])
        try:
            revision=args.quickpi_revision or subprocess.check_output(['git','-C',str(args.quickpi_root),'rev-parse','HEAD'],text=True,stderr=subprocess.DEVNULL).strip()
        except (OSError,subprocess.SubprocessError):revision='unavailable'
        source_hashes={name:hashlib.sha256((args.quickpi_root/'quick_pi_plugin'/name).read_bytes()).hexdigest() for name in ['board_geometry.py','mesh.py','solver.py','service.py','analytics.py']}
        report=dict(schema='portfolio.dc-conduction-study/v1',board=dataset['board'],
            public_source='https://github.com/wayri/3-Phase-inverter-board/tree/283f41b65c193abcc7e63c8c919dacdbccc89829',
            operating_conditions_basis='Public README documents 500 W capability but no DC source voltage, load current or terminal operating point. This study uses an explicitly normalized 1 A copper path, not an inferred hardware operating point.',
            model='2.5D layered linear triangular DC conductivity FEM',summary=summary,assumptions=assumptions,
            source=dict(pad='J10.1',net='Vdc',voltage_reference_V=1.,position_mm=[50.96,104.12]),
            load=dict(pad='Q4.2',net='Vdc',current_A=1.,position_mm=[206.82,111.98]),
            layers=[{key:row[key] for key in ['id','name','z_mm','thickness_mm']} for row in geometry['layers']],
            material={key:value for key,value in result['material'].items() if not isinstance(value,list)},
            solver=dict(repository='https://github.com/wayri/WayriCAD',revision=revision,source_sha256=source_hashes,
                python=sys.version.split()[0],kicad=pcbnew.GetBuildVersion(),numpy=np.__version__,scipy=scipy.__version__),
            mesh_refinement=runs,analytical_rectangle=analytical,
            two_final_steps_below_one_percent=all(row.get('drop_change_percent',math.inf)<1 for row in runs[-2:]),
            losses=result['analytics']['losses'],geometry_warnings=geometry['warnings'],
            display=dict(layer='F.Cu',sampling_edge_mm=edge,cell_count=len(voltage_cells),
                sampling='Fully interior copper squares; no boundary extrapolation. Values are not fabricated or generated gradients.',
                static_plot='Elementwise solved mean voltage drop, on exact final-mesh triangles.'))
        args.output.mkdir(parents=True,exist_ok=True)
        for filename,value in [('inverter-real-dc.json',dataset),('inverter-real-dc-report.json',report)]:
            (args.output/filename).write_text(json.dumps(value,separators=(',',':'),allow_nan=False)+'\n',encoding='utf-8',newline='\n')
        # A standalone quantitative plot uses actual element values; no screen
        # capture, illustrative overlay or image synthesis enters this output.
        plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'text.color':'#e8edf0','axes.labelcolor':'#9caeb8','xtick.color':'#8497a4','ytick.color':'#8497a4'})
        fig, ax=plt.subplots(figsize=(12,7.2),dpi=150,facecolor='#101923')
        ax.set_facecolor('#101923')
        collection=PolyCollection(xy,array=mean_drop,cmap='viridis',edgecolors='none',clim=(0,dataset['fields'][0]['range'][1]))
        ax.add_collection(collection)
        ax.autoscale_view();ax.set_aspect('equal');ax.invert_yaxis()
        ax.margins(.06)
        for label,point,color in [('J10.1 · source',[50.96,104.12],'#8bedd7'),('Q4.2 · 1 A load',[206.82,111.98],'#ffd875')]:
            ax.scatter(*point,s=85,facecolors='none',edgecolors=color,linewidths=1.8,zorder=5)
            ax.annotate(label,point,xytext=(0,19),textcoords='offset points',ha='center',color=color,fontsize=10)
        for spine in ax.spines.values():spine.set_visible(False)
        ax.set_xlabel('Saved PCB X (mm)');ax.set_ylabel('Saved PCB Y (mm)')
        bar=fig.colorbar(collection,ax=ax,fraction=.035,pad=.035,shrink=.75)
        bar.set_label('DC voltage drop (mV)');bar.outline.set_visible(False)
        fig.suptitle('Vdc copper · computed DC conduction',x=.09,ha='left',fontsize=19,fontweight='bold')
        fig.text(.09,.905,f"J10.1 → Q4.2  |  Normalized 1 A  |  {max_drop:.3f} mV maximum drop  |  {result['total_power_W']*1000:.3f} mW loss",color='#b8cad3',fontsize=11)
        fig.text(.09,.035,'35 µm saved copper · 20 °C · 0.5 mm mesh · F.Cu shown, both layers solved\nDC copper model only; not measured performance or a 500 W operating-point simulation.',color='#9cabb5',fontsize=9,linespacing=1.7)
        fig.subplots_adjust(left=.09,right=.91,top=.84,bottom=.14)
        fig.savefig(args.output/'inverter-real-dc.png',facecolor=fig.get_facecolor(),dpi=150)
        plt.close(fig)
        assert hashlib.sha256(args.board.read_bytes()).hexdigest()==digest
        size=sum((args.output/name).stat().st_size for name in ['inverter-real-dc.json','inverter-real-dc-report.json','inverter-real-dc.png'])
        assert size<5*1024*1024
        print('Samples per field:',len(voltage_cells),'artifact bytes:',size,'available GiB:',round(shutil.disk_usage(args.output.anchor).free/2**30,2),flush=True)

if __name__=='__main__':main()
