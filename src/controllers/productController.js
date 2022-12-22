const isValid = require("../validation/validators")
const productModel=require('../models/productModel')
const aws = require('../aws/awsConfiq')

//===================Create product=======================//
const createProducts = async function (req, res) {
    try {
        let data = req.body;
        let file = req.files;

        let { title, description, price, currencyId, currencyFormat, isFreeShipping, availableSizes, style, installments } = data;

        //body empty or not
        if (!isValid.isValidRequestBody(data)) {
            return res.status(400).send({ status: false, message: "Provide the Product's Data" });
        }

        //title validation
        if (!title) {
            return res.status(400).send({ status: false, message: "Provide the Title Name" });
        }

        let checkTitle = await productModel.findOne({ title: title });
        if (checkTitle) {
            return res.status(400).send({ status: false, message: `Product with this ${title} is Already Present` });
        }

        //description validation
        if (!description) {
            return res.status(400).send({ status: false, message: "Please Write Description About Product " });
        }

        //price validation
        if (!price) {
            return res.status(400).send({ status: false, message: "Price is Required" });
        }
        if (price <= 0) {
            return res.status(400).send({ status: false, message: "Price can't be Zero or less than Zero " });
        }
        if (!/^[0-9]*$/.test(price)) {
            return res.status(400).send({ status: false, message: "Price should be in Number" });
        }

        //currencyId validation
        if (!currencyId) {
            return res.status(400).send({ status: false, message: "Provide the CurrencyId " });
        }
        if (currencyId != "INR") {
            return res.status(400).send({ status: false, message: "CurrencyId should be in INR" });
        }

        //currencyFormat validation
        if (!currencyFormat) {
            return res.status(400).send({ status: false, message: "Please Enter Currency Symbol" });
        }
        if (currencyFormat != "₹") {
            return res.status(400).send({ status: false, message: "Currency Symbol should be only in '₹'" });
        }

        //isFreeShipping validation
        if (isFreeShipping != null) { 
            if (!(isFreeShipping.toLowerCase() === "true" || isFreeShipping.toLowerCase() === "false")) {
                return res.status(400).send({ status: false, message: "Please Provide only Boolean Value" });
            }
            data["isFreeShipping"] = isFreeShipping.toLowerCase();
        }

        //profile image validation
        if (file && file.length > 0) {
            if (!isValid.isValidFile(file[0].originalname)) {
                return res.status(400).send({ status: false, message: "Image Should be of JPEG/ JPG/ PNG" });
            }
            //store the profile image in aws and creating profile image url via "aws package" 
            let url = await aws.uploadFile(file[0]);
            data["productImage"] = url;
        } else {
            return res.status(400).send({ status: false, message: "Please Provide ProductImage" });
        }

        //Size validation
        if (!availableSizes) {
            return res.status(400).send({ status: false, message: "Please Enter Size of Product" });
        }
        
       
          if(!isValid.isValidAvailableSizes(availableSizes)){
            return res.status(400).send({ status: false, message: "Please Enter correct Sizes S, XS,M,X, L,XXL, XL" });
          }
        

        //installments validation
        if (installments) {
            if (!/^[0-9]*$/.test(installments)) {
                return res.status(400).send({ status: false, message: "Installments value Should be only number" });
            }
            if (installments < 0) {
                return res.status(400).send({ status: false, message: "installments Shoud be In Valid  Number only" });
            }
        }

        //style validation
       
            if (!style) {
                return res.status(400).send({ status: false, message: "Provide the style " });
            }
        

        //after checking all the validation, than creating the product data
        const createdProduct = await productModel.create(data);
        return res.status(201).send({
            status: true,
            message: "Product is Created Successfully",
            data: createdProduct,
        });
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};


//===================get product details by filter=======================//

const getProductByFilter = async function (req, res) {
    try {
        let filter = req.query;
        //filtering keys destrucing
        let { size, name, priceGreaterThan, priceLessThan } = filter;
        let data = { isDeleted: false };

        //filtering through size key(availableSizes)
        if (size != null) {  
            if (size.length > 0) {
                size = size.replace(/\s+/g, "").toUpperCase().split(",").map(String);
                if (!size) {
                    return res.status(400).send({ status: false, message: "Please Enter Size Value " });
                }
                data["availableSizes"] = { $in: size };
            } else {
                return res.status(400).send({ status: false, message: "Provide The size as u have selected" });
            }
        }

        //filtering through name key(title)
        if (name != null) {
            if (name.trim().length > 0) {
                data["title"] = name;
            } else {
                return res.status(400).send({ status: false, message: "Provide The name as u have selected" });
            }
        }

        //filtering through price key(price)
        if (priceGreaterThan != null) {
            if (priceGreaterThan.length > 0) {
                if (!/^[0-9]*$/.test(priceGreaterThan)) {
                    return res.status(400).send({ status: false, message: "priceGreaterThan should be in numbers" });
                }
                data["price"] = { $gte: priceGreaterThan };
            } else {
                return res.status(400).send({ status: false, message: "Provide The priceGreaterThan as u have selected" });
            }
        }

        if (priceLessThan != null) {
            if (priceLessThan.length > 0) {
                if (!/^[0-9]*$/.test(priceLessThan)) {
                    return res.status(400).send({ status: false, message: "priceLessThan should be in numbers" });
                }
                if (priceLessThan <= 0) {
                    return res.status(400).send({ status: false, message: "priceLessThan can't be zero" });
                }
                data["price"] = { $lte: priceLessThan };
            } else {
                return res.status(400).send({ status: false, message: "Provide The priceLessThan as u have selected" });
            }
        }

        //finding data from DB
        const getData = await productModel.find(data).sort({ price: 1 });
        if (getData.length == 0) {
            return res.status(404).send({ status: false, message: "No Data Found With These Filters" });
        }
        return res.status(200).send({ status: true, data: getData });
    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};

//===================get product by ID=======================//
const getproduct = async function (req, res) {
    try {
        let productId = req.params.productId

        
        if (!productId) {
            res.status(400).send({ status: false, message: "Please provide productId!" })
        }
        if (!isValid.isIdValid(productId)) {
            return res.status(400).send({ status: false, msg: "please  provide valid productId" })
        }

        const data = await productModel.findById({ _id: productId })
        return res.status(200).send({ status: true, message: "User profile details", data: data })
    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}
//===================update product by ID=======================//

const updateProduct = async function (req, res) {
    try {
        let productId = req.params.productId;

        let data = req.body;
        let files = req.files;

        let { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments } = data; // destructuring req.body

        //body empty
        if (!data || (Object.keys(data).length == 0 && !files))
            return res.status(400).send({ status: false, message: "Provide Data in Body" });

        //productId validation
        if (!productId) {
            res.status(400).send({ status: false, message: "Please provide productId!" })
        }
        if (!isValid.isIdValid(productId)) {
            return res.status(400).send({ status: false, message: "Please provide valid productId" });
        }

        // product is present or not
        let productData = await productModel.findOne({ _id: productId, isDeleted: false });
        if (!productData) {
            return res.status(404).send({ message: "Product is not present!" });
        }
        //title unique and other validation
        let newObj = {};

        if (title != null) {
            if (!title) {
                return res.status(400).send({ status: false, message: "Provide the title details" });
            }

            if (!/^[a-zA-Z ]{2,30}$/.test(title)) {
                return res.status(400).send({ status: false, message: "Enter a valid title" });
            }

            let titleData = await productModel.findOne({ title: title });
            if (titleData) {
                return res.status(404).send({ message: `${title} is already present` });
            }
            newObj["title"] = title;
        }
        //description validation
        if (description != null) {
            if (!description) {
                return res.status(400).send({ status: false, message: "Please write description about product " });
            }

            newObj["description"] = description;
        }

        //price validation
        if (price != null) {
            if (price.length > 0) {
                if (!/^[0-9]*$/.test(price)) {
                    return res.status(400).send({ status: false, message: "price should be in numbers" });
                }

                if (price <= 0) {
                    return res.status(400).send({ status: false, message: "Price can't be zero" });
                }

                newObj["price"] = price;
            } else {
                return res.status(400).send({ status: false, message: "Please Fill The Price as U have selected" });
            }
        }
        //currencyId validation
        if (currencyId != null) {
            if (!currencyId) {
                return res.status(400).send({ status: false, message: "Provide the currencyId " });
            }

            if (currencyId != "INR") {
                return res.status(400).send({ status: false, message: "Invalid! CurrencyId should be in INR" });
            }

            newObj["currencyId"] = currencyId;
        }

        //currencyFORMAT validation
        if (currencyFormat != null) {
            if (currencyFormat.length > 0) {
                if (currencyFormat != "₹") {
                    return res.status(400).send({ status: false, message: "Invalid currencyFormat,Only ₹ accepted" });
                }

                newObj["currencyFormat"] = currencyFormat;
            } else {
                return res.status(400).send({ status: false, message: "Provide The Currecny Format as u have Selected " });
            }
        }

        //isFreeshipping validation
        if (isFreeShipping != null) {
            if (!(isFreeShipping.toLowerCase() === "true" || isFreeShipping.toLowerCase() === "false")) {
                return res.status(400).send({ status: false, message: "Please Provide only Boolean Value" });
            }

            newObj["isFreeShipping"] = isFreeShipping.toLowerCase();
        }

        //style validation
        if (style != null) {
            if (!style) {
                return res.status(400).send({ status: false, message: "Provide the Style " });
            }

            newObj["style"] = style;
        }

        //installments validation
        if (installments != null) {
            if (installments.length > 0) {
                if (!/^[0-9]*$/.test(installments)) {
                    return res.status(400).send({ status: false, message: "Installments value Should be only number" });
                }

                if (installments < 0) {
                    return res.status(400).send({ status: false, message: "Installments Shoud be In Valid  Number only" });
                }

                newObj["installments"] = installments;
            } else {
                return res.status(400).send({ status: false, message: "Installments can't be null as u have selected", });
            }
        }

        //availableSizes validation
        if (availableSizes != null) {
            if (!availableSizes) {
                return res.status(400).send({ status: false, message: "Please Enter Size of Product" });
            }
              if(!isValid.isValidAvailableSizes(availableSizes)){
                return res.status(400).send({ status: false, message: "Please Enter correct Sizes S, XS,M,X, L,XXL, XL" });
              }
            // newObj["availableSizes"] = availableSizes;     

            //checking for already present
            let arr = productData.availableSizes;
            for (let i = 0; i < arr.length; i++) {
                if (arr.includes(availableSizes)) {
                    return res.status(404).send({ status: false, message: `This ${availableSizes} size is Already Present ` });
                }
            }
        }

        //profile image validation
        if (files) {
            if (files == null) {
                return res.status(400).send({ status: false, message: "Provide the Product Image as u have selected" });
            }

            if (files && files.length > 0) {
                if (!isValid.isValidFile(files[0].originalname)) {
                    return res.status(400).send({ status: false, message: "Image Should be in 'JPEG/ JPG/ PNG' format" });
                }

                //store the profile image in aws and creating profile image url via "aws package" 
                let uploadedFileURL = await uploadFile(files[0]);
                newObj["productImage"] = uploadedFileURL;
            }
        }

        //updation part
        const updateProduct = await productModel.findByIdAndUpdate(
            { _id: productId },
            // { $set: newObj },
            { $set: newObj,
                 $push: { availableSizes: availableSizes } },
            { new: true }
        );
        return res.status(200).send({ status: true, message: "Product updated", data: updateProduct });
    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};


//===================Delete product by ID=======================//
const deleteProductById = async function (req, res) {
    try {
        const productId = req.params.productId;

        //productId validation
        if (!productId) {
            res.status(400).send({ status: false, message: "Please provide productId!" })
        }
        if (!isValid.isIdValid(productId)) {
            return res.status(400).send({ status: false, message: "Invalid productId." });
        }
        const findProduct = await productModel.findById(productId);
        if (!findProduct) {
            return res.status(404).send({ status: false, message: `No product found by ${productId}` }); ///product
        }
        if (findProduct.isDeleted == true) {
            return res.status(400).send({ status: false, message: `Product has been already deleted.` });
        }

        //deletation part
        const deletedProduct = await productModel.findOneAndUpdate(
            { _id: productId },
            { $set: { isDeleted: true, deletedAt: new Date() } },
            { new: true }
        ).select({ _id: 1, title: 1, isDeleted: 1, deletedAt: 1 });

        res.status(200).send({ status: true, message: "Product deleted successfully", data: deletedProduct });
    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};

module.exports ={createProducts,getProductByFilter,getproduct,updateProduct,deleteProductById}