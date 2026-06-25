import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_LOCAL_BACKEND_API;

export const ApiHelper = {

    get: async (url: string, endpoint: string, params = {}) => {
        try {
            const response = await axios.get(`${url}${endpoint}`, { params });
            return response.data;
        } catch (error) {
            console.log('API Error:', error);
            throw error;
        }
    },

    post: async (url: string, endpoint: string, data: any) => {
        try {
            const response = await axios.post(`${url}`,`${endpoint}`, data);
            return response.data;
        } catch(error) {
            console.log(`API Error:`, error);
            throw error;
        }
    }, 

    put: async (url: string, endpoint: string, data: any) => {
        try {
            const response = await axios.put(`${url}`,`${endpoint}`, data);
            return response.data;
        } catch (error) {
            console.log(`API Error::`, error);
            throw error; 
        }
    }


}