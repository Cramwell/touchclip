"use client";

import { FormEvent, Fragment, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";
import { addUserEmailToProduct } from "@/lib/actions";

interface Props {
  productId: string;
}

const Modal = ({ productId }: Props) => {
  let [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    await addUserEmailToProduct(productId, email);

    setIsSubmitting(false);
    setEmail("");
    closeModal();
  };

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <>
      <button type="button" className="btn" onClick={openModal}>
        Track
      </button>

      <Dialog
        open={isOpen}
        onClose={closeModal}
        className="relative z-10 focus:outline-none"
      >
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 backdrop-blur-2xl duration-300 ease-out">
              <div className="flex justify-between">
                <div className="p-3 border border-gray-200 rounded-10">
                  <Image
                    src="/assets/icons/logo.jpeg"
                    alt="logo"
                    width={28}
                    height={28}
                  />
                </div>

                <Image
                  src="/assets/icons/x-close.svg"
                  alt="close"
                  width={24}
                  height={24}
                  className="cursor-pointer"
                  onClick={closeModal}
                />
              </div>

              <h4 className="dialog-head_text">
                Stay updated with product pricing alerts right in your inbox!
              </h4>

              <p className="text-sm text-gray-600 mt-2">
                Never miss a bargain again with our timely alerts!
              </p>

              <form className="flex flex-col mt-5" onSubmit={handleSubmit}>
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <div className="dialog-input_container">
                  <Image
                    src="/assets/icons/mail.svg"
                    alt="mail"
                    width={18}
                    height={18}
                  />
                  <input
                    required
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="dialog-input"
                  />
                </div>

                <button type="submit" className="dialog-btn">
                  {isSubmitting ? "Submitting..." : "Track"}
                </button>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default Modal;
