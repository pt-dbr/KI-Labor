# Herkunft des Modells

MobileNet V1 mit Breitenfaktor 0,25 und Eingabegröße 224 × 224. Ursprüngliche TensorFlow.js-Layers-Datei und Gewichtsdaten aus der [öffentlichen Modellablage des TensorFlow.js-Projekts](https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json). Das Projekt verwendet den Ausgabeknoten nach globalem Average Pooling. Die Gewichte der davor liegenden Schichten wurden unverändert übernommen und in `weights.bin` zusammengefasst.

TensorFlow.js 4.22.0 stammt aus dem [offiziellen npm-Paket](https://www.npmjs.com/package/@tensorflow/tfjs/v/4.22.0). Die Apache-2.0-Lizenz für TensorFlow.js liegt in [vendor/LICENSE](../vendor/LICENSE).

In der Browserdistribution wurde der Regenerator-Fallback von einem dynamisch erzeugten Funktionsaufruf auf eine direkte Zuweisung an `globalThis.regeneratorRuntime` umgestellt. Damit funktioniert die Bibliothek mit der Content Security Policy der Anwendung ohne `unsafe-eval`.
