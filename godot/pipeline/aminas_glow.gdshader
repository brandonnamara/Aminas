// Aminas glow (windows, crystals, magic): unlit vertex colour, like the web game's MeshBasicMaterial.
// Same colour-space rule as aminas_voxel.gdshader.
shader_type spatial;
render_mode unshaded, cull_back;

vec3 to_srgb(vec3 c) {
	return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, c * 12.92, lessThan(c, vec3(0.0031308)));
}

void fragment() {
	vec3 c = COLOR.rgb;
	if (OUTPUT_IS_SRGB) {
		c = to_srgb(c);
	}
	ALBEDO = c;
}
