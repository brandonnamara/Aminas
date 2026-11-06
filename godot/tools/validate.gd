# Aminas asset pipeline validation (Environment Phase 3).
# Run:  godot --headless --path godot --import                      (first: import the .glb files)
#       xvfb-run -a godot --path godot --rendering-driver opengl3 --script res://tools/validate.gd
# For every .glb in res://assets: checks scale (1 unit = 1 island cell), pivot (footprint centred on the origin, ground
# at y = 0), geometry (surfaces, vertices, vertex colours), materials (solid = lit, rough, vertex colour as albedo;
# glow = unshaded); then lines them up under the game's camera angle and lighting and saves a render.
# Writes res://validation_report.json and res://validation_render.png.
extends SceneTree

# expected footprint in cells (from assets/library/manifest.json)
const EXPECT := {
	"b_hatchery_1": [3, 3], "b_habitat_2": [3, 3], "r_forge": [3, 3], "oak_1": [1, 1], "oakOld_2": [1, 1], "pine_1": [1, 1],
	"glowcap_2": [1, 1], "crystals_1": [1, 1], "lanternPost_1": [1, 1], "cliff_1": [2, 1.5], "mossyRock_1": [1.5, 1.5], "pond_1": [2, 2],
}
# the game's camera basis (island3d.js): screen-right and screen-up
const RIGHT := Vector3(0.70710678, 0, -0.70710678)
const UP := Vector3(-0.35355, 0.86603, -0.35355)
const SUN := 2.2 # LIGHT.sun intensity in voxstyle.js
const HEMI := 1.3 # LIGHT.hemi intensity
const SUN_COMPAT := 0.4
const AMB_COMPAT := 0.12

func _initialize() -> void:
	await process_frame # the root must be inside the tree before global transforms mean anything
	var stage := Node3D.new()
	get_root().add_child(stage)
	var report := []
	var files := DirAccess.get_files_at("res://assets")
	var names := []
	for f in files:
		if f.ends_with(".glb"):
			names.append(f.get_basename())
	names.sort()
	var cursor := 0.0
	for n in names:
		var ps := load("res://assets/" + n + ".glb") as PackedScene
		if ps == null:
			report.append({"asset": n, "error": "did not load"})
			continue
		var inst := ps.instantiate() as Node3D
		stage.add_child(inst)
		var info := _inspect(inst, n)
		# the exported half-resolution twin: same footprint and pivot, fewer vertices
		var lps := load("res://assets/lod/" + n + "_lod.glb") as PackedScene
		if lps:
			var li := lps.instantiate() as Node3D
			stage.add_child(li)
			var linfo := _inspect(li, n)
			info["lod_vertices"] = linfo["vertices"]
			info["lod_ratio"] = snappedf(float(linfo["vertices"]) / max(1, info["vertices"]), 0.01)
			info["lod_ok"] = linfo["vertices"] < info["vertices"] and linfo["pivot_ok"] and linfo["materials_ok"] and abs(linfo["size"][0] - info["size"][0]) <= 0.25
			li.queue_free()
		else:
			info["lod_ok"] = false
		report.append(info)
		var w: float = max(info["size"][0], info["size"][2])
		cursor += w * 0.5 + 0.6
		inst.position = RIGHT * cursor
		cursor += w * 0.5 + 0.6
	# light like the game (LIGHT in voxstyle.js): warm sun from upper-left-front, a bright sky fill.
	# The game's raw values (sun 2.2, hemisphere 1.3) are three.js intensities and clip every green in Godot.
	# Calibrated against the web viewer by sampling the same faces (docs/GODOT_PIPELINE.md, section 5):
	# Compatibility renderer sun 0.4, ambient 0.12; Forward+ / Mobile (linear lighting) start from 2.2 / PI and 1.3 / PI.
	var sun := DirectionalLight3D.new()
	sun.light_color = Color("#ffe6b8")
	sun.light_energy = float(OS.get_environment("SUN_E")) if OS.get_environment("SUN_E") != "" else (SUN_COMPAT if _compat() else SUN / PI)
	sun.shadow_enabled = true
	stage.add_child(sun)
	sun.look_at_from_position(Vector3(-9, 22, 17), Vector3.ZERO, Vector3.UP)
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#eef3ea")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#eaf6ff")
	env.ambient_light_energy = float(OS.get_environment("AMB_E")) if OS.get_environment("AMB_E") != "" else (AMB_COMPAT if _compat() else HEMI / PI)
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	var we := WorldEnvironment.new()
	we.environment = env
	stage.add_child(we)
	# the game's orthographic camera
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	var centre := RIGHT * (cursor * 0.5) + Vector3(0, 1.0, 0)
	var back := RIGHT.cross(UP).normalized()
	cam.size = cursor * 0.62
	stage.add_child(cam)
	cam.look_at_from_position(centre + back * 60.0, centre, UP)
	cam.make_current()
	# Godot picks automatic LODs by screen size and the decimated LODs smear voxel colours; LOD_THRESHOLD=0 renders full
	# detail (GODOT_PIPELINE.md: use the hand-made _lod .glb rather than generated LODs)
	if OS.get_environment("LOD_THRESHOLD") != "":
		get_root().mesh_lod_threshold = float(OS.get_environment("LOD_THRESHOLD"))
	for i in 4:
		await process_frame
	var img := get_root().get_texture().get_image()
	img.save_png("res://validation_render.png")
	# instancing: a grove of 400 trees as MultiMeshes (one draw per mesh surface), full model near, LOD twin far
	stage.queue_free()
	await process_frame
	var grove := _grove()
	get_root().add_child(grove)
	for i in 4:
		await process_frame
	get_root().get_texture().get_image().save_png("res://validation_grove.png")
	var fa := FileAccess.open("res://validation_report.json", FileAccess.WRITE)
	fa.store_string(JSON.stringify({"godot": Engine.get_version_info()["string"], "renderer": str(ProjectSettings.get_setting("rendering/renderer/rendering_method")),
		"gpu": RenderingServer.get_video_adapter_name(), "assets": report, "grove": grove.get_meta("info")}, "  "))
	fa.close()
	print("validated ", report.size(), " assets")
	quit()

func _inspect(node: Node3D, n: String) -> Dictionary:
	var aabb := AABB()
	var first := true
	var surfaces := 0
	var verts := 0
	var colours := true
	var mats := []
	for mi: MeshInstance3D in _meshes(node):
		var m: Mesh = mi.mesh
		var box: AABB = mi.global_transform * m.get_aabb()
		if first:
			aabb = box
			first = false
		else:
			aabb = aabb.merge(box)
		for s in m.get_surface_count():
			surfaces += 1
			var arr := m.surface_get_arrays(s)
			verts += (arr[Mesh.ARRAY_VERTEX] as PackedVector3Array).size()
			if arr[Mesh.ARRAY_COLOR] == null or (arr[Mesh.ARRAY_COLOR] as PackedColorArray).size() == 0:
				colours = false
			var mat: Material = mi.get_active_material(s)
			var sd: Dictionary = RenderingServer.mesh_get_surface(m.get_rid(), s)
			var d := {"node": String(mi.name), "class": mat.get_class() if mat else "none", "auto_lods": (sd.get("lods", []) as Array).size(),
				"cast_shadow": mi.cast_shadow != GeometryInstance3D.SHADOW_CASTING_SETTING_OFF}
			if mat is ShaderMaterial:
				var sh := (mat as ShaderMaterial).shader
				d["shader"] = sh.resource_path.get_file() if sh else "none"
				d["unshaded"] = sh != null and sh.code.contains("render_mode unshaded")
			elif mat is BaseMaterial3D:
				var b := mat as BaseMaterial3D
				d["name"] = b.resource_name
				d["unshaded"] = b.shading_mode == BaseMaterial3D.SHADING_MODE_UNSHADED
				d["vertex_colour_albedo"] = b.vertex_color_use_as_albedo
				d["vertex_colour_srgb"] = b.vertex_color_is_srgb
				d["roughness"] = snappedf(b.roughness, 0.01)
				d["metallic"] = snappedf(b.metallic, 0.01)
				d["transparent"] = b.transparency != BaseMaterial3D.TRANSPARENCY_DISABLED
			mats.append(d)
	var exp: Array = EXPECT.get(n, [0, 0])
	var size := aabb.size
	var centre := aabb.get_center()
	var out := {
		"asset": n, "size": [snappedf(size.x, 0.01), snappedf(size.y, 0.01), snappedf(size.z, 0.01)],
		"centre_xz": [snappedf(centre.x, 0.01), snappedf(centre.z, 0.01)], "min_y": snappedf(aabb.position.y, 0.01),
		"surfaces": surfaces, "vertices": verts, "vertex_colours": colours, "materials": mats, "expected_footprint": exp,
	}
	# checks: the footprint fits (overhang up to one prop voxel each side, trees' canopies may spread a cell), the pivot
	# is the footprint centre, the ground sits at y = 0 (assets that hang below the rim are allowed to go lower)
	# buildings: front steps, porches and eaves may reach half a cell past the footprint (art bible: entrance steps sit
	# on the access cell), which is what the Hatchery (+0.25 / +0.38) and the Forge (+0.5) do
	var slack := 1.25 if n.begins_with("oak") or n.begins_with("pine") or n.begins_with("glowcap") or n.begins_with("crystal") or n.begins_with("lantern") or n.begins_with("mossy") else 0.55
	out["scale_ok"] = size.x <= exp[0] + slack and size.z <= exp[1] + slack and size.x >= exp[0] * 0.3
	out["pivot_ok"] = abs(centre.x) <= 0.6 and abs(centre.z) <= 0.6
	out["ground_ok"] = aabb.position.y > -0.3 or n.begins_with("cliff")
	out["colours_ok"] = colours
	# every surface uses an Aminas shader (the post-import script ran); glow surfaces are unlit and cast no shadow
	var mats_ok := true
	for d in mats:
		if not d.has("shader"):
			mats_ok = false
		elif d["unshaded"] and d["cast_shadow"]:
			mats_ok = false
	out["materials_ok"] = mats_ok
	return out

# 400 trees (oak, pine) on a 20 x 20 grid, as MultiMeshInstance3D per surface. Near half uses the full mesh, far
# half the _lod twin, switched with visibility ranges, the same rule as the web game's widest-zoom nature LOD.
func _grove() -> Node3D:
	var root := Node3D.new()
	var kinds := ["oak_1", "pine_1"]
	var instances := 0
	var draws := 0
	for k in kinds.size():
		for lod in [false, true]:
			var path: String = "res://assets/" + ("lod/" + kinds[k] + "_lod" if lod else kinds[k]) + ".glb"
			var src := (load(path) as PackedScene).instantiate()
			for mi in src.find_children("*", "MeshInstance3D", true, false):
				var mm := MultiMesh.new()
				mm.transform_format = MultiMesh.TRANSFORM_3D
				mm.mesh = (mi as MeshInstance3D).mesh
				var xs := []
				for gx in 20:
					for gz in 20:
						if (gx + gz) % 2 == k:
							xs.append(Transform3D(Basis(Vector3.UP, float((gx * 7 + gz * 13) % 4) * PI / 2), Vector3(gx * 1.6 - 16, 0, gz * 1.6 - 16)))
				mm.instance_count = xs.size()
				for i in xs.size():
					mm.set_instance_transform(i, xs[i])
				var mmi := MultiMeshInstance3D.new()
				mmi.multimesh = mm
				# visibility ranges measure from the camera; the camera below sits 60 units back
				if lod:
					mmi.visibility_range_begin = 66.0
				else:
					mmi.visibility_range_end = 66.0
				root.add_child(mmi)
				draws += 1
				if not lod:
					instances += xs.size()
			src.free()
	var sun := DirectionalLight3D.new()
	sun.light_color = Color("#ffe6b8")
	sun.light_energy = SUN_COMPAT if _compat() else SUN / PI
	sun.shadow_enabled = true
	root.add_child(sun)
	sun.look_at_from_position(Vector3(-9, 22, 17), Vector3.ZERO, Vector3.UP)
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#bfe0f6")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#eaf6ff")
	env.ambient_light_energy = AMB_COMPAT if _compat() else HEMI / PI
	var we := WorldEnvironment.new()
	we.environment = env
	root.add_child(we)
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = 26.0
	root.add_child(cam)
	var back := RIGHT.cross(UP).normalized()
	cam.look_at_from_position(back * 60.0, Vector3.ZERO, UP)
	cam.make_current()
	root.set_meta("info", {"trees": instances, "multimesh_nodes": draws})
	return root

func _compat() -> bool:
	return str(ProjectSettings.get_setting("rendering/renderer/rendering_method")) == "gl_compatibility"

func _meshes(n: Node) -> Array:
	var out := []
	if n is MeshInstance3D:
		out.append(n)
	for c in n.get_children():
		out.append_array(_meshes(c))
	return out
