import axios from "axios";
export const sendReq = async (method, url, headers = undefined, body = undefined) => {
  try {
    const config = {
      method,
      url,
      ...(headers !== undefined && { headers: headers }),
      ...(body !== undefined && { data: body }),
    };

    const response = await axios(config);
    return response;
  } catch (error) {
    if (error.response && error.response.status) {
      return { status: error.response.status, message: "Not Found" };
    } else {
      console.error(`${method.toUpperCase()} request error2:`, error);
      return error;
    }
  }
};
