import axios from "axios";
import { RECAPTCHA_API_URL } from "../utils/config.js";

const recaptchaAPI = axios.create({
    baseURL: RECAPTCHA_API_URL
});

export default recaptchaAPI;