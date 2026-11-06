# Post-import script for Aminas .glb assets (set it as "Import Script" in the .glb import settings, or with
# import_script/path in the .import file). It:
#   1. replaces the glTF materials with the Aminas shaders (correct colours in every renderer, see the shaders);
#   2. keeps glow surfaces unlit and out of shadows;
#   3. names the root after the file so instances read clearly in the scene tree.
@tool
extends EditorScenePostImport

const VOXEL := preload("res://pipeline/aminas_voxel.gdshader")
const GLOW := preload("res://pipeline/aminas_glow.gdshader")

func _post_import(scene: Node) -> Object:
	var voxel := ShaderMaterial.new()
	voxel.shader = VOXEL
	var glow := ShaderMaterial.new()
	glow.shader = GLOW
	for mi in scene.find_children("*", "MeshInstance3D", true, false):
		var m := mi as MeshInstance3D
		for s in m.mesh.get_surface_count():
			var old := m.mesh.surface_get_material(s)
			var is_glow := old is BaseMaterial3D and (old as BaseMaterial3D).shading_mode == BaseMaterial3D.SHADING_MODE_UNSHADED
			m.mesh.surface_set_material(s, glow if is_glow else voxel)
			if is_glow:
				m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	scene.name = get_source_file().get_file().get_basename()
	return scene
