// Aminas voxel surface for Godot 4. Matches the web game's MeshLambertMaterial with vertex colours.
// The .glb files store vertex colours in linear space (glTF rule). The Forward+ and Mobile renderers light in linear
// space and use them as they are. The Compatibility renderer (OpenGL, web export) lights in sRGB space
// (OUTPUT_IS_SRGB), so the colours must be encoded first, or every surface turns dark and over-saturated.
shader_type spatial;
render_mode diffuse_lambert, specular_disabled, cull_back;

vec3 to_srgb(vec3 c) {
	return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, c * 12.92, lessThan(c, vec3(0.0031308)));
}

void fragment() {
	vec3 c = COLOR.rgb;
	if (OUTPUT_IS_SRGB) {
		c = to_srgb(c);
	}
	ALBEDO = c;
	ROUGHNESS = 1.0;
	METALLIC = 0.0;
}
