import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import pickle

# ✅ Load trained model
model_path = "cnn_model.h5"
if not os.path.exists(model_path):
    raise FileNotFoundError(f"❌ Model file '{model_path}' not found!")

model = tf.keras.models.load_model(model_path, compile=False)
model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])

# ✅ Load Label Encoder
label_encoder_path = "label_encoder.pkl"
if not os.path.exists(label_encoder_path):
    raise FileNotFoundError(f"❌ Label Encoder file '{label_encoder_path}' not found! Please re-save it.")

with open(label_encoder_path, "rb") as le_file:
    label_encoder = pickle.load(le_file)  # Load previously saved LabelEncoder

app = Flask(__name__)
CORS(app)

# ✅ Set the correct input shape for prediction
INPUT_SHAPE = model.input_shape[1]  # Extract from model

# Home route to serve the index.html file
@app.route("/")
def home():
    return render_template("index.html")

# Prediction route to handle EEG data and return predictions
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        
        beta = float(data['beta'])
        gamma = float(data['gamma'])
        delta = float(data['delta'])
        alpha = float(data['alpha'])
        theta = float(data['theta'])

        # ✅ Ensure input matches the expected shape
        input_eeg = [beta, gamma, delta, alpha, theta] + [0] * (INPUT_SHAPE - 5)  
        input_data = np.array([input_eeg]).reshape((1, INPUT_SHAPE, 1))

        # ✅ Make prediction
        prediction = model.predict(input_data)
        predicted_class = np.argmax(prediction)

        # ✅ Convert predicted class to disorder name
        predicted_disorder = label_encoder.inverse_transform([predicted_class])[0]

        return jsonify({"prediction": predicted_disorder})

    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    app.run(debug=True)