import{H as a}from"./index-DiyJyCat.js";const e={getCategories:async()=>{const{data:t}=await a.get("/api/settings/categories");return t.data??[]}};export{e as s};
