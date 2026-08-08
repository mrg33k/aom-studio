import Capacitor

final class CornerBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(CornerAirPodsPlugin())
    }
}
