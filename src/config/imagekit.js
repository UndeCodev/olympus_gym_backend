import fs from "fs-extra";
import ImageKit from "imagekit";
import {
  IMAGEKIT_PRIVATE_KEY,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
} from "../utils/config.js";

const imagekit = new ImageKit({
  publicKey: IMAGEKIT_PUBLIC_KEY,
  privateKey: IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: IMAGEKIT_URL_ENDPOINT,
});

export const uploadImage = async ({ folder, filePath, fileName }) => {
  const file = await fs.readFile(filePath);

  return await imagekit.upload({
    folder,
    file,
    fileName,
  });
};
