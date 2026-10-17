const { withAndroidManifest, withInfoPlist } = require('expo/config-plugins')
module.exports = function withLocalNetwork(config) {
	config = withAndroidManifest(config, (config) => {
		const application = config.modResults.manifest.application[0]
		application.$['android:usesCleartextTraffic'] = 'true'
		return config
	})
	return withInfoPlist(config, (config) => {
		config.modResults.NSBonjourServices = ['_soundtouch._tcp']
		config.modResults.NSLocalNetworkUsageDescription = 'Find and control SoundTouch speakers on your local network.'
		// The local exception covers speaker hostnames and numeric LAN IPs on supported iOS versions.
		config.modResults.NSAppTransportSecurity = { NSAllowsLocalNetworking: true }
		return config
	})
}
